import{NextResponse}from'next/server'
import{artifactAt,latestArtifact}from'@/lib/myspace/artifacts/store'
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const{id}=await params;const url=new URL(req.url);const pinned=url.searchParams.get('integrity');const integrity=pinned||latestArtifact(id)?.integrity
 const artifact=integrity?await artifactAt(id,integrity):null
 if(!artifact)return NextResponse.json({error:'Artifact unavailable. The installation reference has not been changed.'},{status:404})
 return NextResponse.json(artifact,{headers:{'Cache-Control':pinned?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','ETag':'"'+artifact.integrity+'"'}})
}
