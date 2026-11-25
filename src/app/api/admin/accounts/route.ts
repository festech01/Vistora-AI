import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
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
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin
  try {
    const data = await req.json()
    if (data.action === 'list') {
      if (!Number.isSafeInteger(data.page) || data.page < 1) return reply({ error: 'Invalid page.' }, 400)
      const result = await admin.listUsers({ page: data.page, perPage: 20 })
      if (result.error) throw result.error
      return reply({ users: result.data.users.map(summary), next: Boolean(result.data.nextPage) })
    }
    if (typeof data.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(data.id)) return reply({ error: 'Choose an account.' }, 400)
    let update
    if (data.action === 'name' && typeof data.name === 'string' && data.name.trim().length <= 60)
      update = { user_metadata: { display_name: data.name.trim() } }
    else if (data.action === 'access' && typeof data.paused === 'boolean')
      update = { app_metadata: { studio_paused: data.paused } }
    else return reply({ error: 'Check the account details.' }, 400)
    const result = await admin.updateUserById(data.id, update)
    if (result.error || !result.data.user) throw Error()
    return reply({ user: summary(result.data.user) })
  } catch { return reply({ error: 'Could not complete the account request. Please try again.' }, 502) }
}
