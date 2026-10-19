// 학생이 고른 Git commit 원문을 서버에 전달할 묶음으로 만든다. 학생 코드를 실행하거나 작업 파일을 수정하지 않는다.
// 호출자는 등록된 학생 프로젝트 root만 전달한다. 이 모듈을 임의 경로를 받는 공개 HTTP API로 직접 노출하지 않는다.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {realpath} from 'node:fs/promises';import {isAbsolute} from 'node:path';import {devNull} from 'node:os';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {readGitSourceTree,buildGitSourceTar} from './git-source-tar.mjs';
const run=promisify(execFile),sha=(kind,b)=>createHash('sha1').update(Buffer.from(`${kind} ${b.length}\0`)).update(b).digest('hex');
export const STUDENT_SOURCE_EXPORT_SCHEMA='alekov.student-source.v1';
export const STUDENT_SOURCE_EXPORT_LIMITS=Object.freeze({gzipBytes:3_000_000,bodyBytes:4_200_000,tarBytes:120*1024*1024,commitBytes:1024*1024});
const fail=code=>Object.assign(Error(code),{code});
const same=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
function environment(){const env={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'])if(typeof process.env[k]==='string')env[k]=process.env[k];return {...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':devNull,GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',LC_ALL:'C'};}
function github(value){if(typeof value!=='string')throw fail('STUDENT_SOURCE_REPOSITORY_INVALID');const s=value.replace(/^git@github\.com:/,'https://github.com/').replace(/\.git$/,'').replace(/\/$/,'');if(!/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/.test(s))throw fail('STUDENT_SOURCE_REPOSITORY_INVALID');return s;}
/** source는 기존 student-source.admit에 전달한다. 크기 초과는 메타데이터 접수를 막지 않고 원문 보류 사유로 반환한다. */
export async function exportStudentSource({projectRoot,repoUrl,commit,signal}={}){
  if(typeof projectRoot!=='string'||!isAbsolute(projectRoot)||!/^[a-f0-9]{40}$/.test(commit??'')||signal!==undefined&&!(signal instanceof AbortSignal))throw fail('STUDENT_SOURCE_EXPORT_INVALID');
  const repo=github(repoUrl),root=await realpath(projectRoot);
  async function git(args,maxBuffer=8192,input){try{const pending=run('git',['--no-optional-locks','-C',root,...args],{env:environment(),encoding:'buffer',windowsHide:true,shell:false,timeout:30000,maxBuffer,signal});pending.child.stdin.end(input);return(await pending).stdout;}catch(error){throw fail(signal?.aborted?'STUDENT_SOURCE_EXPORT_CANCELLED':error?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER'?'STUDENT_SOURCE_TOO_LARGE':'STUDENT_SOURCE_GIT_UNAVAILABLE');}}
  const top=(await git(['rev-parse','--show-toplevel'])).toString('utf8').trim();if(!same(await realpath(top),root))throw fail('STUDENT_SOURCE_PROJECT_ROOT_MISMATCH');
  const remote=github((await git(['config','--get','remote.origin.url'])).toString('utf8').trim());if(remote.toLowerCase()!==repo.toLowerCase())throw fail('STUDENT_SOURCE_REPOSITORY_MISMATCH');
  try{
    const object=await git(['cat-file','commit',commit],STUDENT_SOURCE_EXPORT_LIMITS.commitBytes);if(sha('commit',object)!==commit)throw fail('STUDENT_SOURCE_COMMIT_MISMATCH');
    const rows=readGitSourceTree(await git(['ls-tree','-r','-z','--full-tree',commit],4*1024*1024));
    if(rows.length>2000)throw fail('STUDENT_SOURCE_TOO_LARGE');
    const batch=rows.length?await git(['cat-file','--batch'],STUDENT_SOURCE_EXPORT_LIMITS.tarBytes,rows.map(r=>r.oid).join('\n')+'\n'):Buffer.alloc(0);
    const tar=buildGitSourceTar({commit,rows,batch,maxBytes:STUDENT_SOURCE_EXPORT_LIMITS.tarBytes});
    if(signal?.aborted)throw fail('STUDENT_SOURCE_EXPORT_CANCELLED');const gz=gzipSync(tar,{level:6});
    if(gz.length>STUDENT_SOURCE_EXPORT_LIMITS.gzipBytes)return {ok:false,code:'STUDENT_SOURCE_TOO_LARGE',gzipBytes:gz.length,source:null};
    const source={schema:STUDENT_SOURCE_EXPORT_SCHEMA,repoUrl:repo,commit,commitObjectBase64:object.toString('base64'),archiveGzBase64:gz.toString('base64')},bodyBytes=Buffer.byteLength(JSON.stringify(source));
    if(bodyBytes>STUDENT_SOURCE_EXPORT_LIMITS.bodyBytes)return {ok:false,code:'STUDENT_SOURCE_TOO_LARGE',gzipBytes:gz.length,bodyBytes,source:null};
    return {ok:true,source,gzipBytes:gz.length,bodyBytes,archiveSha256:createHash('sha256').update(gz).digest('hex')};
  }catch(error){if(['STUDENT_SOURCE_TOO_LARGE','STUDENT_SOURCE_SYMLINK_UNSUPPORTED','GIT_SUBMODULE_UNSUPPORTED','STUDENT_SOURCE_PATH_INVALID'].includes(error?.code))return {ok:false,code:error.code,source:null};throw error;}
}
