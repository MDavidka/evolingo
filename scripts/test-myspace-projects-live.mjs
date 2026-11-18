import assert from'node:assert/strict';
const base=process.env.MYSPACE_TEST_ORIGIN||'https://api.sycord.site';
async function guest(){const r=await fetch(base+'/api/myspace');assert.equal(r.status,200);return r.headers.getSetCookie().find(c=>c.startsWith('myspace_guest='))?.split(';')[0]}
const a=await guest(),b=await guest();assert.ok(a&&b);const created=[];
async function call(cookie,path,method='GET',body,expected=200){const r=await fetch(base+'/api/myspace/projects'+path,{method,headers:{cookie,Origin:base,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data}
try{
 const source={'src/App.tsx':'export default function App(){return null}'};
 const initial=await call(a,'','POST',{name:'Integration draft',description:'Ephemeral test',files:source},201);created.push(initial.id);
 const first=await call(a,'/'+initial.id);assert.deepEqual(first.current.files,source);assert.equal(first.project.workingVersion,null);assert.equal(first.history.length,1);
 await call(b,'/'+initial.id,'GET',undefined,404);await call(b,'/'+initial.id,'PATCH',{revision:initial.revision,files:source,summary:'forged'},409);
 const changed={'src/App.tsx':'export default function App(){return <p>Changed</p>}'};
 const next=await call(a,'/'+initial.id,'PATCH',{revision:initial.revision,files:changed,summary:'Second draft'});assert.notEqual(next.revision,initial.revision);
 await call(a,'/'+initial.id,'PATCH',{revision:initial.revision,files:source,summary:'Stale edit'},409);
 const previous=await call(a,'/'+initial.id+'?version='+initial.versionId);assert.deepEqual(previous.current.files,source);assert.equal(previous.project.revision,next.revision);
 await call(a,'/'+initial.id,'PATCH',{revision:next.revision,files:previous.current.files,summary:'Restore source'});
 const restored=await call(a,'/'+initial.id);assert.deepEqual(restored.current.files,source);assert.equal(restored.history.length,3);assert.equal(restored.project.workingVersion,null);
 assert.ok((await call(a,'')).projects.some(p=>p.id===initial.id));assert.ok(!(await call(b,'')).projects.some(p=>p.id===initial.id));
 await call(b,'/'+initial.id,'DELETE',{confirm:true},404);await call(a,'/'+initial.id,'DELETE',{confirm:false},400);await call(a,'/'+initial.id,'DELETE',{confirm:true});created.splice(0,1);await call(a,'/'+initial.id,'GET',undefined,404);
 const readiness=await fetch(base+'/api/myspace/builder',{headers:{cookie:a}}).then(r=>r.json());assert.equal(readiness.mode,'setup');assert.equal(readiness.executionEnabled,false);
 console.log('PROJECT LIVE PASS: create/read/edit/history/restore, owner separation, stale writes, explicit delete and disabled builder.');
}finally{for(const id of created)await call(a,'/'+id,'DELETE',{confirm:true})}
