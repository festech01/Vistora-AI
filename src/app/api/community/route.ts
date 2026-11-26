import { NextRequest, NextResponse } from 'next/server'
import { studioDb, customer } from '../../../core/community'
export const dynamic='force-dynamic'
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(){
 try{
  const result=await studioDb().from('studio_bulletin').select('message').eq('published',true).maybeSingle()
  if(result.error)throw result.error
  return json({message:result.data?.message||''})
 }catch{return json({error:'Announcement unavailable.'},503)}
}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return json({error:'Origin denied.'},403)
 try{
  const d=await req.json(),db=studioDb()
  if(d.action==='visit'){
    const r=await db.rpc('studio_home_view');if(r.error)throw r.error
    return json({ok:true})
  }
  const user=await customer(req)
  if(!user)return json({error:'Sign in to contact support.'},401)
  if(d.action==='send'){
   const message=typeof d.message==='string'?d.message.trim():''
   if(!message||message.length>2000)return json({error:'Enter a message under 2001 characters.'},400)
   const result=await db.from('studio_complaints').insert({owner:user.id,email:user.email,message})
   if(result.error)throw result.error
  }else if(d.action!=='mine')return json({error:'Unknown request.'},400)
  const result=await db.from('studio_complaints').select('id,message,state,reply,created_at').eq('owner',user.id).order('created_at',{ascending:false}).limit(50)
  if(result.error)throw result.error
  return json({rows:result.data})
 }catch{return json({error:'Unable to complete the request.'},503)}
}
