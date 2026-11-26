import { NextRequest, NextResponse } from 'next/server'
import { features } from '../../../../core/test-access.mjs'
import { randomUUID, createHash } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import { verify } from '../../../../core/test-access.mjs'

export const dynamic = 'force-dynamic'
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

function summary(user: User) {
  return {
    id: user.id,
    email: user.email,
    created: user.created_at,
    confirmed: Boolean(user.email_confirmed_at),
    name: user.user_metadata?.display_name || '',
    grant: user.app_metadata?.studio_grant || null,
    paused: user.app_metadata?.studio_paused === true
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return reply({ error: 'Origin denied.' }, 403)
  const secret = process.env.VISTORA_OWNER_ACCESS
  const owner = verify(req.cookies.get('__Host-vistora-owner')?.value, process.env.VISTORA_SESSION_SECRET)
  if (!secret || owner?.role !== 'owner' || owner.id !== createHash('sha256').update(secret).digest('hex').slice(0, 24))
    return reply({ error: 'Sign in to the owner dashboard.' }, 401)
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return reply({ error: 'Customer accounts are waiting for a Supabase connection.' }, 503)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const admin = db.auth.admin
  try {
    const data = await req.json()
    if(data.action==='overview'){
      const [metrics,banner]=await Promise.all([db.rpc('studio_owner_metrics'),db.from('studio_bulletin').select('message,published').single()])
      if(metrics.error||banner.error)throw Error()
      return reply({metrics:metrics.data,banner:banner.data})
    }
    if(data.action==='banner'){
      if(typeof data.message!=='string'||data.message.length>240||typeof data.published!=='boolean'||(data.published&&!data.message.trim()))return reply({error:'Enter an announcement of up to 240 characters.'},400)
      const r=await db.from('studio_bulletin').update({message:data.message.trim(),published:data.published}).eq('id',true)
      if(r.error)throw r.error
      return reply({ok:true})
    }
    if(data.action==='inbox'){
      if(!Number.isSafeInteger(data.page)||data.page<1)return reply({error:'Invalid page.'},400)
      const start=(data.page-1)*20
      const r=await db.from('studio_complaints').select('*').order('created_at',{ascending:false}).order('id').range(start,start+20)
      if(r.error)throw r.error
      return reply({rows:r.data.slice(0,20),next:r.data.length>20})
    }
    if(data.action==='respond'){
      if(!['Open','In progress','Resolved'].includes(data.state)||typeof data.reply!=='string'||data.reply.length>2000)return reply({error:'Check the reply and status.'},400)
      const r=await db.from('studio_complaints').update({reply:data.reply.trim(),state:data.state}).eq('id',data.id).select('id').single()
      if(r.error)throw r.error
      return reply({ok:true})
    }
    if (data.action === 'list') {
      if (!Number.isSafeInteger(data.page) || data.page < 1) return reply({ error: 'Invalid page.' }, 400)
      const term=typeof data.search==='string'?data.search.trim().slice(0,254):''
      const result=await db.rpc('studio_customer_search',{term,page_number:data.page})
      if (result.error) throw result.error
      return reply({ users: result.data.slice(0,20), next: result.data.length>20 })
    }
    if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id)) return reply({ error: 'Choose an account.' }, 400)
    let update
    if (data.action === 'name' && typeof data.name === 'string' && data.name.trim().length <= 60)
      update = { user_metadata: { display_name: data.name.trim() } }
    else if (data.action === 'access' && typeof data.paused === 'boolean')
      update = { app_metadata: { studio_paused: data.paused } }
    else if(data.action==='removeGrant')update={app_metadata:{studio_grant:null}}
    else if(data.action==='grant'){
      const allowed=features.filter(f=>Array.isArray(data.features)&&data.features.includes(f))
      if(!allowed.length||![1,7,30].includes(data.days))return reply({error:'Choose a tool and access period.'},400)
      update={app_metadata:{studio_grant:{id:randomUUID(),features:allowed,expiry:Date.now()+data.days*86400000}}}
    }else return reply({ error: 'Check the account details.' }, 400)
    const result = await admin.updateUserById(data.id, update)
    if (result.error || !result.data.user) throw Error()
    return reply({ user: summary(result.data.user) })
  } catch { return reply({ error: 'Could not complete the account request. Please try again.' }, 502) }
}
