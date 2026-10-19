// Git blob 원문을 tar로 묶는다. git archive의 export-ignore/export-subst에 따른 누락·치환을 피한다.
const fault=code=>{throw Object.assign(Error(code),{code});};
const utf8=new TextDecoder('utf-8',{fatal:true});
const pax=(key,value)=>{const tail=Buffer.from(` ${key}=${value}\n`);let n=tail.length+1;for(;;){const next=String(n).length+tail.length;if(next===n)return Buffer.concat([Buffer.from(String(n)),tail]);n=next;}};
function entry(name,body,{type='0',mode=0o644}={}){
  const h=Buffer.alloc(512),b=Buffer.from(name);if(b.length>100)fault('STUDENT_SOURCE_PATH_INVALID');b.copy(h);
  const oct=(offset,length,value)=>{const s=value.toString(8);if(s.length>=length)fault('STUDENT_SOURCE_TOO_LARGE');h.write(s.padStart(length-1,'0')+'\0',offset,length,'ascii');};
  oct(100,8,mode);oct(108,8,0);oct(116,8,0);oct(124,12,body.length);oct(136,12,0);h.fill(32,148,156);h[156]=type.charCodeAt(0);h.write('ustar\0',257,6,'ascii');h.write('00',263,2,'ascii');
  const sum=h.reduce((n,b)=>n+b,0);h.write(sum.toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');return [h,body,Buffer.alloc((512-body.length%512)%512)];
}
/** git ls-tree 결과를 읽는다. 일반 파일이 아닌 항목은 조용히 제외하지 않고 원문 보류로 구분한다. */
export function readGitSourceTree(raw){
  const rows=[];let at=0;while(at<raw.length){const end=raw.indexOf(0,at);if(end<0)fault('STUDENT_SOURCE_TREE_INVALID');const row=raw.subarray(at,end),tab=row.indexOf(9),meta=row.subarray(0,tab).toString('ascii'),m=/^(100644|100755|120000|160000) (blob|commit) ([a-f0-9]{40})$/.exec(meta);if(tab<0||!m)fault('STUDENT_SOURCE_TREE_INVALID');
    let path;try{path=utf8.decode(row.subarray(tab+1));}catch{fault('STUDENT_SOURCE_PATH_INVALID');}
    if(!path||path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\x00-\x1f\x7f]/u.test(path)||Buffer.byteLength(path)>4000||path.split('/').length>63)fault('STUDENT_SOURCE_PATH_INVALID');
    if(m[1]==='160000'||m[2]==='commit')fault('GIT_SUBMODULE_UNSUPPORTED');if(m[1]==='120000')fault('STUDENT_SOURCE_SYMLINK_UNSUPPORTED');
    rows.push({path,mode:m[1],oid:m[3]});at=end+1;
  }return rows;
}
export function buildGitSourceTar({commit,rows,batch,maxBytes}){
  let at=0;const parts=entry('pax_global_header',pax('comment',commit),{type:'g'});let size=parts.reduce((n,b)=>n+b.length,0);
  for(let i=0;i<rows.length;i++){const row=rows[i],end=batch.indexOf(10,at);if(end<0)fault('STUDENT_SOURCE_BLOB_INVALID');const m=/^([a-f0-9]{40}) blob (\d+)$/.exec(batch.subarray(at,end).toString('ascii'));if(!m||m[1]!==row.oid)fault('STUDENT_SOURCE_BLOB_INVALID');const n=Number(m[2]);if(!Number.isSafeInteger(n)||end+1+n>=batch.length||batch[end+1+n]!==10)fault('STUDENT_SOURCE_BLOB_INVALID');const body=batch.subarray(end+1,end+1+n);at=end+2+n;
    const path='repo/'+row.path;let name=path,blocks=[];if(Buffer.byteLength(path)>100){blocks.push(...entry('PaxHeaders/'+i,pax('path',path),{type:'x'}));name='repo/entry-'+i;}
    blocks.push(...entry(name,body,{mode:row.mode==='100755'?0o755:0o644}));size+=blocks.reduce((n,b)=>n+b.length,0);if(size+1024>maxBytes)fault('STUDENT_SOURCE_TOO_LARGE');parts.push(...blocks);
  }
  if(at!==batch.length)fault('STUDENT_SOURCE_BLOB_INVALID');parts.push(Buffer.alloc(1024));return Buffer.concat(parts);
}
