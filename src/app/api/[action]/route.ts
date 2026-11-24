import {NextRequest,NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {createClient} from '@supabase/supabase-js'
import {createPaystackAdapter} from '../../../../integrations/paystack.mjs'
import {packageAmount} from '../../../core/catalog.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const env=process.env
const authReady=()=>Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SECRET_KEY)
const client=(admin=false)=>createClient(env.SUPABASE_URL!,admin?env.SUPABASE_SECRET_KEY!:env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})
const pay=()=>createPaystackAdapter({mode:env.PAYSTACK_MODE,secret:env.PAYSTACK_SECRET_KEY,webhookSecret:env.PAYSTACK_WEBHOOK_SECRET,signatureMode:env.PAYSTACK_SIGNATURE_MODE||'timestamped'})
// Customer checkout remains closed until the generation pipeline is commissioned.
const checkoutReady=()=>false
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
type Context={params:Promise<{action:string}>}
async function account(){const jwt=(await cookies()).get('__Host-vistora')?.value;if(!jwt)return null;const {data}=await client().auth.getUser(jwt);return data.user?.email_confirmed_at?data.user:null}
export async function GET(req:NextRequest,ctx:Context){const {action}=await ctx.params
if(action==='status'){let rates={};try{if(Date.parse(env.FX_VALID_UNTIL||'')>Date.now())rates=JSON.parse(env.FX_NGN_RATES||'{}')}catch{}return json({auth:authReady(),payments:checkoutReady(),video:false,rates})}
if(action!=='account'||!authReady())return json({error:'Account unavailable'},401)
try{const user=await account();if(!user)return json({error:'Sign in first'},401);const db=client(true);const [ledger,jobs]=await Promise.all([db.from('studio_ledger').select('delta').eq('owner',user.id),db.from('studio_jobs').select('id,state').eq('owner',user.id).order('created_at',{ascending:false}).limit(50)]);if(ledger.error||jobs.error)throw Error();return json({email:user.email,balance:ledger.data.reduce((s,r)=>s+r.delta,0),jobs:jobs.data})}catch{return json({error:'Account service unavailable'},503)}}
export async function POST(req:NextRequest,ctx:Context){const {action}=await ctx.params
if(!authReady())return json({error:'Studio services are awaiting configuration.'},503)
if(action!=='webhook'&&req.headers.get('origin')!==req.nextUrl.origin)return json({error:'Origin denied'},403)
if(+(req.headers.get('content-length')||0)>131072)return json({error:'Request too large'},413)
try{const bytes=await req.arrayBuffer();if(bytes.byteLength>131072)return json({error:'Request too large'},413)
if(action==='webhook'){const adapter=pay();let event;try{event=adapter.readWebhook(Buffer.from(bytes),req.headers.get(env.PAYSTACK_SIGNATURE_MODE==='legacy'?'x-paystack-signature':'paystack-signature'))}catch{return json({error:'Invalid notification'},400)}if(!event)return json({received:true});const db=client(true);const {data:o,error}=await db.from('studio_orders').select('*').eq('id',event.reference).single();if(error||!o)throw Error();const tx=await adapter.verify({reference:o.id,amountMinor:o.amount,currency:o.currency,email:''});const settled=await db.rpc('settle_studio_payment',{p_order:o.id,p_transaction:tx.providerTransactionId});if(settled.error)throw Error();return json({received:true})}
const data=JSON.parse(new TextDecoder().decode(bytes))
if(action==='signup'||action==='login'){if(typeof data.email!=='string'||typeof data.password!=='string'||data.password.length<10||data.password.length>256)return json({error:'Enter a valid email and password of at least 10 characters.'},400);const auth=client().auth;const creds={email:data.email,password:data.password};if(action==='signup'){const r=await auth.signUp(creds);if(r.error)throw Error();return json({received:true})}const r=await auth.signInWithPassword(creds);if(r.error||!r.data.session||!r.data.user.email_confirmed_at)return json({error:'Check your credentials and verify your email.'},401);(await cookies()).set('__Host-vistora',r.data.session.access_token,{httpOnly:true,secure:true,path:'/',sameSite:'lax',maxAge:r.data.session.expires_in});return json({signedIn:true})}
if(action==='logout'){(await cookies()).delete('__Host-vistora');return json({signedOut:true})}
const user=await account();if(!user)return json({error:'Verified sign-in required'},401)
if(!checkoutReady())return json({error:'Live checkout is closed pending commissioning.'},503)
const db=client(true)
if(action==='quote'){packageAmount(data.credits);const r=await db.from('studio_orders').insert({owner:user.id,credits:data.credits}).select('id,amount,currency,expires').single();if(r.error)throw Error();return json(r.data)}
if(action==='checkout'){const r=await db.from('studio_orders').update({state:'pending'}).eq('id',data.quote).eq('owner',user.id).eq('state','quoted').gt('expires',new Date().toISOString()).select('*').single();if(r.error)return json({error:'Checkout quote expired or already used.'},409);return json(await pay().initialize({reference:r.data.id,amountMinor:r.data.amount,currency:r.data.currency,email:user.email}))}
return json({error:'Unknown operation'},404)
}catch{return json({error:'The service could not complete this request.'},502)}}
