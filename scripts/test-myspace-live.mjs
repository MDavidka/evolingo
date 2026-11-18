import assert from'node:assert/strict';
const base=process.env.MYSPACE_TEST_ORIGIN||'http://127.0.0.1:28500';
async function guest(){const r=await fetch(base+'/api/myspace');assert.equal(r.status,200);const cookie=r.headers.getSetCookie().find(c=>c.startsWith('myspace_guest='))?.split(';')[0];assert.ok(cookie);return cookie}
const a=await guest(),b=await guest();
async function get(cookie){const r=await fetch(base+'/api/myspace',{headers:{cookie}});assert.equal(r.status,200);return r.json()}
async function post(cookie,body,expected=200,origin=process.env.MYSPACE_TEST_REQUEST_ORIGIN||base){const r=await fetch(base+'/api/myspace',{method:'POST',headers:{cookie,origin,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,expected,JSON.stringify(await r.json()));}
const mutate=(cookie,action,appId='notes',extra={},expected=200)=>post(cookie,{action,appId,...extra},expected);
try{
 await mutate(a,'install','notes',{consent:true});await mutate(a,'install','focus-board',{consent:true});await mutate(b,'install','notes',{consent:true});
 await mutate(a,'save','notes',{value:'owner-a-notes'});await mutate(a,'save','focus-board',{value:'[]'});await mutate(b,'save','notes',{value:'owner-b-notes'});
 assert.equal((await get(a)).installations.find(i=>i.appId==='notes').data,'owner-a-notes');assert.equal((await get(b)).installations.find(i=>i.appId==='notes').data,'owner-b-notes');assert.equal((await get(a)).installations.find(i=>i.appId==='focus-board').data,'[]');
 await mutate(a,'install','notes',{consent:true});assert.equal((await get(a)).installations.filter(i=>i.appId==='notes').length,1);assert.equal((await get(a)).installations.find(i=>i.appId==='notes').data,'owner-a-notes');
 await mutate(a,'pin','notes',{value:true});await mutate(a,'rename','notes',{value:'Private journal'});assert.equal((await get(a)).installations.find(i=>i.appId==='notes').name,'Private journal');assert.equal((await get(a)).installations.find(i=>i.appId==='notes').pinned,true);
 await mutate(a,'permission','notes',{value:false});assert.equal((await get(a)).installations.find(i=>i.appId==='notes').data,'');await mutate(a,'save','notes',{value:'blocked'},403);
 await mutate(a,'permission','notes',{value:true});assert.equal((await get(a)).installations.find(i=>i.appId==='notes').data,'owner-a-notes');
 await post(a,{action:'save',appId:'notes',value:'forged',owner:b},400);await post(a,{action:'save',appId:'notes',value:'csrf'},403,'https://attacker.invalid');
 await mutate(a,'uninstall');assert.equal((await get(a)).installations.some(i=>i.appId==='notes'),false);await mutate(a,'save','notes',{value:'after-delete'},403);assert.equal((await get(b)).installations.find(i=>i.appId==='notes').data,'owner-b-notes');
 console.log('LIVE PASS: guest separation, app separation, persistence, idempotent installation, rename, pins, permission revoke/regrant, forged owner, CSRF and uninstall.');
}finally{for(const cookie of[a,b])for(const appId of['notes','focus-board'])await mutate(cookie,'uninstall',appId)}
