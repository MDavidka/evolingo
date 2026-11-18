import ipaddr from'ipaddr.js'
export function publicAddress(address:string){try{return ipaddr.process(address).range()==='unicast'}catch{return false}}
export function approvedDomains(raw:string|undefined){return(raw||'api.github.com').split(',').map(s=>s.trim().toLowerCase()).filter(s=>/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(s)&&s.includes('.')&&!s.endsWith('.localhost')&&!ipaddr.isValid(s))}
export function approvedURL(value:string,domains:string[]){
 let url:URL;try{url=new URL(value)}catch{throw Error('INVALID_REQUEST: Invalid URL')}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||(url.port&&url.port!=='443')||!domains.includes(url.hostname.toLowerCase())||ipaddr.isValid(url.hostname.replace(/^\[|\]$/g,'')))throw Error('PERMISSION_DENIED: Target is not an approved HTTPS domain')
 return url
}
