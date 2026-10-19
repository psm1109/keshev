// 등록된 학생 프로젝트에서 쓰는 로컬 원문 내보내기 도구. 업로드·접수·AI 호출은 하지 않는다.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {realpath,open,lstat} from 'node:fs/promises';
import {resolve,isAbsolute,dirname,basename,relative,sep} from 'node:path';
import {devNull} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {exportStudentSource} from './student-source-export.mjs';

const run=promisify(execFile),fail=code=>{throw Object.assign(Error(code),{code});};
const inside=(root,path)=>{const r=relative(root,path);return r===''||r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
const identity=s=>`${s.dev}:${s.ino}:${s.birthtimeMs}`;
const HELP='학생 프로젝트의 Git 원문 묶음을 내보냅니다. 업로드나 과제 제출은 수행하지 않습니다.\n\n사용법: node student-source-cli.mjs --output <프로젝트 밖의 절대 파일 경로> [--commit <40자리 커밋>]\n\n등록된 프로젝트의 최상위 폴더에서 실행하세요. --commit을 생략하면 HEAD를 사용합니다.\n출력 폴더는 미리 있어야 합니다. 기존 파일은 덮어쓰지 않으며 미커밋 작업은 포함하지 않습니다.\n';
const MESSAGES={
  STUDENT_SOURCE_CLI_OPTIONS:'옵션을 확인해 주세요. --output 절대 경로와 선택 사항인 --commit 40자리만 사용할 수 있습니다. --help로 사용법을 확인하세요.',
  STUDENT_SOURCE_OUTPUT_INSIDE_PROJECT:'원문 묶음은 학생 프로젝트 밖에 저장해야 합니다. 프로젝트 밖의 절대 파일 경로를 지정해 주세요.',
  STUDENT_SOURCE_OUTPUT_INSIDE_GIT:'Git 내부 기록 폴더에는 원문 묶음을 저장할 수 없습니다. Git 저장소 밖의 경로를 지정해 주세요.',
  STUDENT_SOURCE_OUTPUT_PARENT:'출력 폴더를 확인하지 못했습니다. 기존 폴더 안의 절대 파일 경로를 지정해 주세요.',
  STUDENT_SOURCE_OUTPUT_EXISTS:'출력 경로에 파일이나 폴더가 이미 있습니다. 기존 파일을 보존했으니 다른 파일 이름을 지정해 주세요.',
  STUDENT_SOURCE_OUTPUT_CHANGED:'저장 중 출력 폴더가 바뀌어 완료를 확인하지 못했습니다. 생성된 파일을 확인한 뒤 다른 경로로 다시 시도해 주세요.',
  STUDENT_SOURCE_OUTPUT_FAILED:'원문 묶음 저장을 완료하지 못했습니다. 생성된 파일이 있으면 보존한 상태이므로 확인한 뒤 다른 경로로 다시 시도해 주세요.',
  STUDENT_SOURCE_PROJECT_ROOT_MISMATCH:'등록된 학생 프로젝트의 최상위 폴더에서 실행해 주세요. 프로젝트 안의 하위 폴더에서는 내보낼 수 없습니다.',
  STUDENT_SOURCE_REPOSITORY_INVALID:'Git origin이 지원되는 GitHub 저장소 주소인지 확인해 주세요.',
  STUDENT_SOURCE_REPOSITORY_MISMATCH:'Git origin과 확인한 저장소 주소가 일치하지 않습니다. 프로젝트의 저장소 설정을 확인해 주세요.',
  STUDENT_SOURCE_GIT_UNAVAILABLE:'Git 저장소·origin·선택한 커밋을 확인하지 못했습니다. Git 설치와 로컬 커밋을 확인해 주세요.',
  STUDENT_SOURCE_COMMIT_MISMATCH:'선택한 커밋의 원문을 확인하지 못했습니다. 로컬 Git 저장소와 커밋을 확인해 주세요.',
  STUDENT_SOURCE_TOO_LARGE:'원문 묶음이 전달 가능한 크기를 넘었습니다. 파일을 잘라 저장하지 않았습니다. 과제와 관계없는 큰 파일을 정리해 커밋한 뒤 다시 시도해 주세요.',
  STUDENT_SOURCE_SYMLINK_UNSUPPORTED:'커밋에 심볼릭 링크가 있습니다. 필요한 실제 파일을 커밋한 뒤 다시 시도해 주세요.',
  GIT_SUBMODULE_UNSUPPORTED:'커밋에 하위 모듈이 있습니다. 필요한 코드를 저장소에 직접 포함한 뒤 다시 시도해 주세요.',
  STUDENT_SOURCE_PATH_INVALID:'원문에 지원하지 않는 파일 경로가 있습니다. 경로를 확인해 주세요.',
  STUDENT_SOURCE_EXPORT_CANCELLED:'원문 내보내기를 취소했습니다.'
};
function options(args){
  if(args.length===1&&args[0]==='--help')return {help:true};
  const out={};
  for(let i=0;i<args.length;i+=2){const name=args[i],value=args[i+1];if(!['--output','--commit'].includes(name)||typeof value!=='string'||!value||Object.hasOwn(out,name))fail('STUDENT_SOURCE_CLI_OPTIONS');out[name]=value;}
  if(!out['--output']||!isAbsolute(out['--output'])||/[\x00-\x1f\x7f]/.test(out['--output'])||out['--commit']!==undefined&&!/^[a-f0-9]{40}$/.test(out['--commit']))fail('STUDENT_SOURCE_CLI_OPTIONS');
  return {output:resolve(out['--output']),commit:out['--commit']};
}
function environment(){const env={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'])if(typeof process.env[k]==='string')env[k]=process.env[k];return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':devNull,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',LC_ALL:'C'};}
/** cwd는 로컬 호출자가 등록한 프로젝트다. 외부 입력으로 임의 root를 받는 HTTP 경로에 노출하지 않는다. */
export async function runStudentSourceCli(args,{cwd=process.cwd(),stdout=process.stdout,stderr=process.stderr}={}){
  try{
    const opt=options(args);if(opt.help){stdout.write(HELP);return 0;}
    const root=await realpath(cwd);
    if(inside(resolve(cwd),opt.output)||inside(root,opt.output))fail('STUDENT_SOURCE_OUTPUT_INSIDE_PROJECT');
    let parent,parentIdentity;
    try{parent=await realpath(dirname(opt.output));parentIdentity=identity(await lstat(parent));}catch{fail('STUDENT_SOURCE_OUTPUT_PARENT');}
    const target=resolve(parent,basename(opt.output));if(inside(root,target))fail('STUDENT_SOURCE_OUTPUT_INSIDE_PROJECT');
    try{await lstat(target);fail('STUDENT_SOURCE_OUTPUT_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
    async function git(argv){try{return(await run('git',['--no-optional-locks','-C',root,...argv],{env:environment(),encoding:'utf8',windowsHide:true,shell:false,timeout:30000,maxBuffer:8192})).stdout.trim();}catch{fail('STUDENT_SOURCE_GIT_UNAVAILABLE');}}
    // 연결된 worktree의 실제 Git 기록 폴더는 프로젝트 밖에 있을 수 있다.
    for(const name of ['--absolute-git-dir','--git-common-dir']){const dir=await realpath(resolve(root,await git(['rev-parse',name])));if(inside(dir,target))fail('STUDENT_SOURCE_OUTPUT_INSIDE_GIT');}
    const repoUrl=await git(['config','--get','remote.origin.url']),commit=opt.commit??await git(['rev-parse','--verify','HEAD^{commit}']);
    if(!/^[a-f0-9]{40}$/.test(commit))fail('STUDENT_SOURCE_GIT_UNAVAILABLE');
    const exported=await exportStudentSource({projectRoot:root,repoUrl,commit});if(!exported.ok)fail(exported.code);
    const bytes=Buffer.from(JSON.stringify(exported.source)),sha256=createHash('sha256').update(bytes).digest('hex');
    let fd;
    try{
      if(await realpath(dirname(opt.output))!==parent||identity(await lstat(parent))!==parentIdentity)fail('STUDENT_SOURCE_OUTPUT_CHANGED');
      fd=await open(target,'wx',0o600);await fd.writeFile(bytes);await fd.sync();
      if((await fd.stat()).size!==bytes.length||identity(await lstat(parent))!==parentIdentity)fail('STUDENT_SOURCE_OUTPUT_CHANGED');
    }catch(error){if(error.code==='EEXIST')fail('STUDENT_SOURCE_OUTPUT_EXISTS');if(error.code==='STUDENT_SOURCE_OUTPUT_CHANGED')throw error;fail('STUDENT_SOURCE_OUTPUT_FAILED');}
    finally{if(fd)await fd.close();}
    stdout.write(JSON.stringify({path:target,commit,sha256,bytes:bytes.length})+'\n');return 0;
  }catch(error){const code=Object.hasOwn(MESSAGES,error?.code)?error.code:'STUDENT_SOURCE_GIT_UNAVAILABLE';stderr.write(code+': '+MESSAGES[code]+'\n');return 1;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)process.exitCode=await runStudentSourceCli(process.argv.slice(2));
