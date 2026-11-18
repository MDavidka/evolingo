import {createHash} from 'node:crypto'
import type {NextRequest} from 'next/server'
import {NextResponse} from 'next/server'
import {enforceRate} from './rate-limit'
import {MyspaceError} from './contracts'

export async function ownerFor(req:NextRequest){
  const cookieToken = req.cookies.get('myspace_guest')?.value
  const headerToken = req.headers.get('x-myspace-guest')?.trim()
  const token = (cookieToken && /^[a-f0-9]{64}$/.test(cookieToken))
    ? cookieToken
    : (headerToken && /^[a-f0-9]{64}$/.test(headerToken) ? headerToken : null)
  if (!token) throw new MyspaceError(401, 'Open Myspace to establish a guest session')
  if (!['GET','HEAD'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const expected = process.env.MYSPACE_HOST_ORIGIN || req.nextUrl.origin
    // Native iOS URLSession requests supply X-Myspace-Guest and no browser Origin header; browser requests must match Origin.
    if (origin && origin !== expected) throw new MyspaceError(403, 'Invalid origin')
    if (!origin && !headerToken) throw new MyspaceError(403, 'Invalid origin')
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new MyspaceError(415, 'JSON content type required')
  }
  const owner = createHash('sha256').update(token).digest('hex')
  await enforceRate(owner)
  return owner
}

export function respond(data:unknown, status=200){
  return NextResponse.json(data, {status, headers:{'Cache-Control':'no-store'}})
}

export function failure(e:unknown){
  return respond(
    {error: e instanceof MyspaceError ? e.message : 'Myspace operation unavailable', code: e instanceof MyspaceError ? e.status : 503},
    e instanceof MyspaceError ? e.status : 503
  )
}
