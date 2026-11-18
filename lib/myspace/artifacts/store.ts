import{readFile}from'node:fs/promises'
import{resolve,join}from'node:path'
import{createHash}from'node:crypto'
import current from'../artifacts.generated.json'
export function latestArtifact(id:string){if(!Object.hasOwn(current,id))return null;const a=current[id as keyof typeof current];return{version:a.version,integrity:a.integrity}}
export async function artifactAt(id:string,integrity:string){
 if(!Object.hasOwn(current,id)||!/^[a-f0-9]{64}$/.test(integrity))return null
 let value:{version:string;integrity:string;html:string}
 try{const text=await readFile(join(resolve(process.env.MYSPACE_ARTIFACT_DIR||'.dev-runtime/myspace-artifacts'),id,integrity+'.json'),'utf8');if(Buffer.byteLength(text)>1100000)return null;value=JSON.parse(text)}catch{const latest=current[id as keyof typeof current];if(latest.integrity!==integrity)return null;value=latest}
 if(typeof value.html!=='string'||value.html.length>1000000||value.integrity!==integrity||createHash('sha256').update(value.html).digest('hex')!==integrity)return null
 return value
}
