import{build}from'esbuild';import fs from'node:fs/promises';import{createHash}from'node:crypto';import{resolve,join}from'node:path';
const artifacts={};
const archiveDir=resolve(process.env.MYSPACE_ARTIFACT_DIR||'.dev-runtime/myspace-artifacts');
async function archive(id,artifact){const directory=join(archiveDir,id);await fs.mkdir(directory,{recursive:true});const path=join(directory,artifact.integrity+'.json');const content=JSON.stringify(artifact);try{await fs.writeFile(path,content,{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e;if(await fs.readFile(path,'utf8')!==content)throw Error('Immutable artifact collision')}}
try{const previous=JSON.parse(await fs.readFile('lib/myspace/artifacts.generated.json','utf8'));for(const[id,artifact]of Object.entries(previous))await archive(id,artifact)}catch(e){if(e.code!=='ENOENT')throw e}

for(const[id,component]of[['notes','Notes'],['focus-board','FocusBoard'],['api-inspector','ApiInspector']]){
 const source=`import React from 'react';import{createRoot}from'react-dom/client';import{${component}}from'./packages/myspace-templates/src/${component}';import{createMyspace}from'./packages/myspace-sdk/src/index';const sdk=createMyspace(window.__MYSPACE_IDENTITY__);createRoot(document.getElementById('root')).render(React.createElement(${component},{storage:sdk.storage,network:sdk.network}));addEventListener('pagehide',()=>sdk.dispose());`;
 const result=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'tsx'},bundle:true,minify:true,write:false,outdir:'/tmp/myspace-artifacts',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
 const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'';
 const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>${css}</style></head><body><div id="root"></div><script>window.__MYSPACE_IDENTITY__=__MYSPACE_BOOTSTRAP__;</script><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`;
 artifacts[id]={version:'1.0.0',html,integrity:createHash('sha256').update(html).digest('hex')};console.log('Built trusted template',id,Buffer.byteLength(html),'bytes');
}
for(const[id,artifact]of Object.entries(artifacts))await archive(id,artifact);
await fs.writeFile('lib/myspace/artifacts.generated.json',JSON.stringify(artifacts));
