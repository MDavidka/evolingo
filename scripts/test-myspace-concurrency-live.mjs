import assert from'node:assert/strict';
const base=process.env.MYSPACE_TEST_ORIGIN||'https://api.sycord.site';const start=await fetch(base+'/api/myspace');const cookie=start.headers.getSetCookie().find(c=>c.startsWith('myspace_guest='))?.split(';')[0];assert.ok(cookie);const created=[];
async function request(path,method='GET',body){const r=await fetch(base+'/api/myspace/projects'+path,{method,headers:{cookie,Origin:base,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return{status:r.status,data:await r.json()}}
const draft=i=>({name:'Concurrency test '+i,description:'Temporary',files:{'src/App.tsx':'export default function App(){return null}'}});
try{
 for(let i=0;i<19;i++){const r=await request('','POST',draft(i));assert.equal(r.status,201,JSON.stringify(r.data));created.push(r.data.id)}
 const parallel=await Promise.all([19,20,21].map(async i=>{const r=await request('','POST',draft(i));if(r.status===201)created.push(r.data.id);return r}));assert.equal(parallel.filter(r=>r.status===201).length,1,JSON.stringify(parallel));assert.equal(parallel.filter(r=>r.status===429).length,2,JSON.stringify(parallel));
 const before=await request('/'+created[0]);const revision=before.data.project.revision;
 const edits=await Promise.all([1,2,3].map(i=>request('/'+created[0],'PATCH',{revision,summary:'Concurrent '+i,files:{'src/App.tsx':'export default function App(){return <p>'+i+'</p>}'}})));assert.equal(edits.filter(r=>r.status===200).length,1);assert.equal(edits.filter(r=>r.status===409).length,2);
 const after=await request('/'+created[0]);assert.equal(after.data.history.length,2);assert.equal(after.data.project.workingVersion,null);
 console.log('CONCURRENCY LIVE PASS: 20-project limit under concurrent create, one accepted competing edit, two stale edits rejected, no orphan version in history.');
}finally{for(const id of created){const r=await request('/'+id,'DELETE',{confirm:true});assert.equal(r.status,200,JSON.stringify(r.data))}}
