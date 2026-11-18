export function builderReadiness(env:Record<string,string|undefined>){
 const missing=['VERCEL_TOKEN','VERCEL_TEAM_ID','VERCEL_PROJECT_ID','MYSPACE_SANDBOX_IMAGE'].filter(k=>!env[k]?.trim())
 const imagePinned=!!env.MYSPACE_SANDBOX_IMAGE?.match(/@sha256:[a-f0-9]{64}$/)
 if(!imagePinned&&!missing.includes('MYSPACE_SANDBOX_IMAGE'))missing.push('MYSPACE_SANDBOX_IMAGE (digest-pinned image required)')
 return{available:false,mode:'setup' as const,reason:'Generated builds are in setup mode. Project source and version history remain available.',missing,provider:'vercel-sandbox',executionEnabled:false}
}
