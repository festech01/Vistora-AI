import { createClient } from '@supabase/supabase-js'
import type {NextRequest} from 'next/server'
export function studioDb(){
  return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
}
export async function customer(req:NextRequest){
  const token=req.cookies.get('__Host-vistora')?.value
  if(!token)return null
  const {data,error}=await studioDb().auth.getUser(token)
  return !error&&data.user?.email_confirmed_at&&!data.user.app_metadata.studio_paused?data.user:null
}
