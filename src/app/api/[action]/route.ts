import {NextRequest,NextResponse} from 'next/server'
import sharp from 'sharp'
import {cookies} from 'next/headers'
import {createClient} from '@supabase/supabase-js'
import {createPaystackAdapter} from '../../../../integrations/paystack.mjs'
import {speechInput,speechCredits,renderSpeech} from '../../../../integrations/speech.mjs'
import {packages,tiers,packageAmount} from '../../../core/catalog.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
const env=process.env
const voiceReady=()=>env.VOICE_COMMISSIONED==='true'&&Boolean(env.OPENAI_API_KEY)&&Number.isSafeInteger(Number(env.VOICE_CREDITS_PER_500))&&Number(env.VOICE_CREDITS_PER_500)>0&&Number(env.VOICE_CREDITS_PER_500)<=10000
const authReady=()=>Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SECRET_KEY)
const client=(admin=false)=>createClient(env.SUPABASE_URL!,admin?env.SUPABASE_SECRET_KEY!:env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
const pay=()=>createPaystackAdapter({mode:env.PAYSTACK_MODE,secret:env.PAYSTACK_SECRET_KEY,webhookSecret:env.PAYSTACK_WEBHOOK_SECRET,signatureMode:env.PAYSTACK_SIGNATURE_MODE||'timestamped'})
// Customer checkout remains closed until the generation pipeline is commissioned.
const videoReady=()=>authReady()&&env.VIDEO_COMMISSIONED==='true'&&env.VIDEO_WORKER_APPROVED==='true'&&Boolean(env.FAL_KEY)&&Date.parse(env.PRICES_VALID_UNTIL||'')>Date.now()&&[env.KLING_5S_CREDITS,env.KLING_10S_CREDITS].every(x=>Number.isSafeInteger(Number(x))&&Number(x)>0)
const imageReady=()=>videoReady()&&env.IMAGE_COMMISSIONED==='true'&&[env.KLING_IMAGE_5S_CREDITS,env.KLING_IMAGE_10S_CREDITS].every(x=>Number.isSafeInteger(Number(x))&&Number(x)>0)
const checkoutReady=()=>false
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
type Context={params:Promise<{action:string}>}
async function account(){const jwt=(await cookies()).get('__Host-vistora')?.value;if(!jwt)return null;const {data}=await client().auth.getUser(jwt);return data.user?.email_confirmed_at && data.user.app_metadata?.studio_paused!==true?data.user:null}
export async function GET(req:NextRequest,ctx:Context){const {action}=await ctx.params
if(action==='status')return json({auth:authReady()})
if(!['account','voices'].includes(action)||!authReady())return json({error:'Account unavailable'},401)
try{const user=await account();if(!user)return json({error:'Sign in first'},401);const db=client(true);
if(action==='voices'){const list=await db.from('studio_voice_orders').select('id,input,created_at').eq('owner',user.id).eq('state','ready').order('created_at',{ascending:false}).limit(30);if(list.error)throw Error();return json(list.data.map(v=>({id:v.id,title:v.input.text.slice(0,65),format:v.input.format})))}
const [ledger,jobs]=await Promise.all([db.from('studio_ledger').select('delta').eq('owner',user.id),db.from('studio_jobs').select('id,state').eq('owner',user.id).order('created_at',{ascending:false}).limit(50)]);if(ledger.error||jobs.error)throw Error();let rates={};try{if(Date.parse(env.FX_VALID_UNTIL||'')>Date.now())rates=JSON.parse(env.FX_NGN_RATES||'{}')}catch{}
return json({offers:packages.map((credits,i)=>({credits,name:tiers[i],naira:packageAmount(credits)/100})),rates,payments:checkoutReady(),voice:voiceReady(),image:imageReady(),video:videoReady(),email:user.email,displayName:user.user_metadata?.display_name||'',balance:ledger.data.reduce((s,r)=>s+r.delta,0),jobs:jobs.data})}catch{return json({error:'Account service unavailable'},503)}}
export async function POST(req:NextRequest,ctx:Context){const {action}=await ctx.params
if(!authReady())return json({error:'Studio services are awaiting configuration.'},503)
if(action!=='webhook'&&req.headers.get('origin')!==req.nextUrl.origin)return json({error:'Origin denied'},403)
const maxBytes=action==='videoquote'?400000:131072
if(+(req.headers.get('content-length')||0)>maxBytes)return json({error:'Request too large'},413)
try{const bytes=await req.arrayBuffer();if(bytes.byteLength>maxBytes)return json({error:'Request too large'},413)
if(action==='webhook'){const adapter=pay();let event;try{event=adapter.readWebhook(Buffer.from(bytes),req.headers.get(env.PAYSTACK_SIGNATURE_MODE==='legacy'?'x-paystack-signature':'paystack-signature'))}catch{return json({error:'Invalid notification'},400)}if(!event)return json({received:true});const db=client(true);const {data:o,error}=await db.from('studio_orders').select('*').eq('id',event.reference).single();if(error||!o)throw Error();const tx=await adapter.verify({reference:o.id,amountMinor:o.amount,currency:o.currency,email:''});const settled=await db.rpc('settle_studio_payment',{p_order:o.id,p_transaction:tx.providerTransactionId});if(settled.error)throw Error();return json({received:true})}
const data=JSON.parse(new TextDecoder().decode(bytes))
if(action==='signup'||action==='login'){
 const email=typeof data.email==='string'?data.email.trim():''
 const name=typeof data.name==='string'?data.name.trim():''
 if(!email||email.length>254||typeof data.password!=='string'||!data.password.length||data.password.length>256||(action==='signup'&&(data.password.length<10||name.length>60)))return json({error:'Check your email and password. New passwords need at least 10 characters.'},400)
 const auth=client().auth
 const credentials={email,password:data.password}
 const result=action==='signup'?await auth.signUp({...credentials,options:{data:{display_name:name},emailRedirectTo:req.nextUrl.origin}}):await auth.signInWithPassword(credentials)
 if(result.error){
 if(result.error.status===429)return json({error:'Too many requests. Please wait before trying again.'},429)
 return json({error:action==='signup'?'Could not create the account. Check your details and try again.':'Check your email and password, and confirm your email before signing in.'},action==='signup'?400:401)
 }
 if(action==='signup'&&!result.data.session)return json({received:true})
 if(!result.data.session||!result.data.user?.email_confirmed_at)return json({error:'Confirm your email before signing in.'},401)
 if(result.data.user.app_metadata?.studio_paused===true)return json({error:'Your studio access is paused. Contact the owner.'},403)
 ;(await cookies()).set('__Host-vistora',result.data.session.access_token,{httpOnly:true,secure:true,path:'/',sameSite:'lax',maxAge:result.data.session.expires_in})
 return json({signedIn:true})
}
if(action==='logout'){(await cookies()).delete('__Host-vistora');return json({signedOut:true})}
const user=await account();if(!user)return json({error:'Verified sign-in required'},401)
if(action==='voicedownload'){const db=client(true);const r=await db.from('studio_voice_orders').select('id,input').eq('id',data.id).eq('owner',user.id).eq('state','ready').single();if(r.error)return json({error:'Recording unavailable.'},404)
const f=await db.storage.from('studio-voice').createSignedUrl(user.id+'/'+r.data.id+'.'+r.data.input.format,3600,{download:'Vistora voice.'+r.data.input.format});if(f.error)throw Error();return json({url:f.data.signedUrl})}
if(action==='voicequote'||action==='voicecreate'){
 if(!voiceReady())return json({error:'Voice generation is not open yet.'},503)
 const db=client(true)
 if(action==='voicequote'){
 let input;try{input=speechInput(data)}catch{return json({error:'Check your script and voice settings.'},400)}
 const credits=speechCredits(input.text,Number(env.VOICE_CREDITS_PER_500))
 const q=await db.from('studio_voice_orders').insert({owner:user.id,input,credits}).select('id,credits').single()
 if(q.error)throw Error();return json(q.data)
 }
 const order=await db.from('studio_voice_orders').select('*').eq('id',data.id).eq('owner',user.id).single()
 if(order.error)return json({error:'Audio order unavailable.'},404)
 const o=order.data;const path=user.id+'/'+o.id+'.'+o.input.format
 const bucket=db.storage.from('studio-voice')
 if(o.state!=='ready'){
 const claim=await db.rpc('studio_claim_voice',{p_owner:user.id,p_order:o.id})
 if(claim.error)return json({error:'Check your credit balance or request a new price.'},409)
 if(!claim.data)return json({error:'This order has already been used. Check again if it is still processing.'},409)
 try{const response=await renderSpeech(o.input,env.OPENAI_API_KEY);if(!response.ok)throw Error()
 const bytes=await response.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>24*1024*1024)throw Error()
 const stored=await bucket.upload(path,bytes,{contentType:o.input.format==='wav'?'audio/wav':'audio/mpeg'})
 if(stored.error)throw Error()
 }catch{const refund=await db.rpc('studio_refund_voice',{p_order:o.id});if(refund.error)throw Error();return json({error:'Audio could not be created. Your credits were returned.'},502)}
 const saved=await db.from('studio_voice_orders').update({state:'ready'}).eq('id',o.id);if(saved.error)throw Error()
 }
 const file=await bucket.createSignedUrl(path,3600,{download:'Vistora voice.'+o.input.format});if(file.error)throw Error();return json({url:file.data.signedUrl})
}
if(action==='videoquote'&&videoReady()){if(data.model!=='Kling 2.5 Turbo Pro'||typeof data.idea!=='string'||!data.idea.trim()||data.idea.length>2400||!['5','10'].includes(data.duration)||!['16:9','9:16','1:1'].includes(data.ratio))return json({error:'Unsupported model or settings.'},400);let reference:string|undefined
if(data.reference!==undefined){
 if(!imageReady())return json({error:'Video from pictures is not open yet.'},503)
 if(typeof data.reference!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(data.reference))return json({error:'Choose a JPG picture.'},400)
 try{const image=sharp(Buffer.from(data.reference.split(',')[1],'base64'),{limitInputPixels:1600000});const meta=await image.metadata();if(meta.format!=='jpeg')throw Error();reference='data:image/jpeg;base64,'+(await image.resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer()).toString('base64')}catch{return json({error:'The picture could not be read.'},400)}
}
const rate=reference?(data.duration==='5'?env.KLING_IMAGE_5S_CREDITS:env.KLING_IMAGE_10S_CREDITS):(data.duration==='5'?env.KLING_5S_CREDITS:env.KLING_10S_CREDITS)
const credits=Number(rate);const q=await client(true).from('studio_video_quotes').insert({owner:user.id,prompt:data.idea,settings:{ratio:data.ratio,duration:data.duration,reference},credits}).select('id,credits,expires').single();if(q.error)throw Error();return json(q.data)}
if(action==='submitvideo'&&videoReady()){const j=await client(true).rpc('studio_accept_video',{p_quote:data.quote,p_owner:user.id});if(j.error)return json({error:'Check your Creator membership, balance and quote expiration.'},409);return json({id:j.data})}
if(action==='download'){const db=client(true);const j=await db.from('studio_jobs').select('provider_result').eq('owner',user.id).eq('id',data.id).eq('state','completed').single();if(j.error)return json({error:'Project unavailable'},404);const f=await db.storage.from('studio-results').createSignedUrl(j.data.provider_result,60);if(f.error)throw Error();return json({url:f.data.signedUrl})}
if(!checkoutReady())return json({error:'Live checkout is closed pending commissioning.'},503)
const db=client(true)
if(action==='quote'){packageAmount(data.credits);const r=await db.from('studio_orders').insert({owner:user.id,credits:data.credits}).select('id,amount,currency,expires').single();if(r.error)throw Error();return json(r.data)}
if(action==='checkout'){const r=await db.from('studio_orders').update({state:'pending'}).eq('id',data.quote).eq('owner',user.id).eq('state','quoted').gt('expires',new Date().toISOString()).select('*').single();if(r.error)return json({error:'Checkout quote expired or already used.'},409);return json(await pay().initialize({reference:r.data.id,amountMinor:r.data.amount,currency:r.data.currency,email:user.email}))}
return json({error:'Unknown operation'},404)
}catch{return json({error:'The service could not complete this request.'},502)}}
