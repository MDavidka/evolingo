import{test}from'node:test';import assert from'node:assert/strict';import{createProject,updateProject,sourcePath,projectMetaAction}from'../projects/schema.ts';import{builderReadiness}from'../builder-config.ts';
const good={name:'My app',description:'Private project',files:{'src/App.tsx':'export default function App(){return null}'}};
test('project source remains separate and forbids unsafe paths',()=>{assert.ok(createProject.safeParse(good).success);for(const path of['../../secret','src/../App.tsx','/tmp/x.tsx','src/App.tsx\u0000','src/node_modules/x.js','package.json','.env','src/a.svg'])assert.equal(sourcePath.safeParse(path).success,false)})
test('project metadata cannot assert owner or approval',()=>{for(const extra of[{owner:'other'},{published:true},{workingVersion:'fake'},{permissions:['connection:ssh']}])assert.equal(createProject.safeParse({...good,...extra}).success,false)})
test('source snapshot enforces count, entry and UTF-8 limits',()=>{for(const files of[{}, {'src/a.ts':'x'},{'src/App.tsx':'😀'.repeat(17000)},Object.fromEntries(Array.from({length:33},(_,i)=>['src/'+(i===0?'App.tsx':'File'+i+'.tsx'),'x']))])assert.equal(createProject.safeParse({...good,files}).success,false)})
test('draft update requires exact revision contract',()=>{assert.ok(updateProject.safeParse({revision:'a'.repeat(64),files:good.files,summary:'Edit'}).success);assert.equal(updateProject.safeParse({revision:'latest',files:good.files,summary:'Edit'}).success,false);assert.equal(updateProject.safeParse({revision:'a'.repeat(64),files:good.files,summary:'Edit',owner:'other'}).success,false)})
test('setup mode cannot be enabled by credentials alone',()=>{const result=builderReadiness({VERCEL_TOKEN:'fake',VERCEL_TEAM_ID:'fake',VERCEL_PROJECT_ID:'fake',MYSPACE_SANDBOX_IMAGE:'image@sha256:'+'a'.repeat(64)});assert.equal(result.available,false);assert.equal(result.executionEnabled,false);assert.equal(result.mode,'setup');assert.deepEqual(result.missing,[])})
test('readiness never returns credential values',()=>{const result=builderReadiness({VERCEL_TOKEN:'private-token',MYSPACE_SANDBOX_IMAGE:'mutable:latest'});assert.ok(result.missing.includes('VERCEL_TEAM_ID'));assert.ok(!JSON.stringify(result).includes('private-token'));assert.ok(result.missing.some(x=>x.includes('digest-pinned')))})
test('project meta actions validate rename, pin, share, unshare and duplicate',()=>{
  assert.ok(projectMetaAction.safeParse({action:'rename',name:'Updated Name'}).success);
  assert.ok(projectMetaAction.safeParse({action:'pin',pinned:true}).success);
  assert.ok(projectMetaAction.safeParse({action:'share',targetOwner:'a1b2c3d4e5f6',role:'viewer'}).success);
  assert.ok(projectMetaAction.safeParse({action:'unshare',targetOwner:'a1b2c3d4e5f6'}).success);
  assert.ok(projectMetaAction.safeParse({action:'duplicate',name:'My Copy'}).success);
  assert.equal(projectMetaAction.safeParse({action:'share',targetOwner:'invalid!@#',role:'admin'}).success,false);
  assert.equal(projectMetaAction.safeParse({action:'rename',name:'',owner:'escalate'}).success,false);
})
