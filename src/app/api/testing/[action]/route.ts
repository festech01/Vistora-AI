import {NextRequest,NextResponse} from 'next/server'
import {get,put,list} from '@vercel/blob'
import {randomUUID,createHash} from 'node:crypto'
import sharp from 'sharp'
import {equal,sign,verify,features} from '../../../../core/test-access.mjs'
import {renderSpeech,speechInput} from '../../../../../integrations/speech.mjs'
import {directPrompt} from '../../../../../integrations/gemini.mjs'
import {createVideoProvider} from '../../../../../integrations/fal.mjs'
export const dynamic='force-dynamic'
export const maxDuration=120
const env=process.env
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers})
const cookie='__Host-vistora-test'
const root='testing/v1/'
const ownerId=()=>createHash('sha256').update(env.VISTORA_OWNER_ACCESS||'').digest('hex').slice(0,24)
async function read(path:string){const r=await get(root+path,{access:'private',useCache:false});if(!r||r.statusCode!==200)return null;return new Response(r.stream).json()}
async function write(path:string,data:unknown){return put(root+path,JSON.stringify(data),{access:'private',allowOverwrite:false,addRandomSuffix:false,contentType:'application/json'})}
const configured=()=>({prompt:!!env.GEMINI_API_KEY,voice:!!env.OPENAI_API_KEY,video:!!env.FAL_KEY,photo:!!env.PIAPI_API_KEY})
function session(role:string,id:string,expiry:number){const r=reply({ok:true,role});r.cookies.set(role==='owner'?'__Host-vistora-owner':cookie,sign(role,id,expiry,env.VISTORA_SESSION_SECRET),{httpOnly:true,secure:true,sameSite:'strict',path:'/',expires:new Date(expiry)});return r}
async function photo(s:unknown){if(typeof s!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s)||s.length>450000)throw Error();return (await sharp(Buffer.from(s.split(',')[1],'base64'),{limitInputPixels:1600000}).rotate().resize({width:900,height:900,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toBuffer()).toString('base64')}
async function pi(path:string,body?:unknown){const r=await fetch('https://api.piapi.ai/api/v1/task'+path,{method:body?'POST':'GET',headers:{'x-api-key':env.PIAPI_API_KEY!,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const j=await r.json();if(!j.data)throw Error();return j.data}
function resultLink(value:unknown){if(typeof value!=='string')return null;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
type Context={params:Promise<{action:string}>}
export async function POST(req:NextRequest,ctx:Context){
 const {action}=await ctx.params
 if(req.headers.get('origin')!==req.nextUrl.origin)return reply({error:'Origin denied.'},403)
 if(!env.VISTORA_SESSION_SECRET||!env.BLOB_READ_WRITE_TOKEN||!env.VISTORA_OWNER_ACCESS)return reply({error:'Testing access is awaiting configuration.'},503)
 try{
 const body=await req.text();if(body.length>1000000)return reply({error:'File too large.'},413);const d=JSON.parse(body)
 if(action==='logout'){const r=reply({ok:true});r.cookies.delete(d.owner===true?'__Host-vistora-owner':cookie);return r}
 if(action==='owner'){if(!equal(d.code,env.VISTORA_OWNER_ACCESS))return reply({error:'Incorrect owner code.'},401);return session('owner',ownerId(),Date.now()+4*3600000)}
 const token=verify(action==='redeem'?d.code:req.cookies.get(['manage','invite','revoke'].includes(action)?'__Host-vistora-owner':cookie)?.value,env.VISTORA_SESSION_SECRET)
 if(!token)return reply({error:'Sign in to continue.'},401)
 if(token.role==='owner'&&token.id===ownerId()&&action!=='redeem'){
 if(action==='manage'){
 const rows=await list({prefix:root+'passes/',limit:1000});const passes=await Promise.all(rows.blobs.slice(-100).map(async b=>{const p=await read(b.pathname.slice(root.length));return p?{...p,revoked:Boolean(await read('revoked/'+p.id))}:null}));return reply({passes:passes.filter(Boolean),configured:configured()})
 }
 if(action==='invite'){const name=typeof d.name==='string'?d.name.trim().slice(0,60):'';const allowed=features.filter(f=>Array.isArray(d.features)&&d.features.includes(f)&&configured()[f as keyof ReturnType<typeof configured>]);if(!name||!allowed.length)return reply({error:'Enter a name and choose an available tool.'},400);const id=randomUUID(),expiry=Date.now()+86400000;await write('passes/'+id,{id,name,features:allowed,expiry,created:Date.now()});return reply({code:sign('invite',id,expiry,env.VISTORA_SESSION_SECRET)})}
 if(action==='revoke'&&/^[a-f0-9-]{36}$/.test(d.id)){if(!await read('revoked/'+d.id))await write('revoked/'+d.id,{time:Date.now()});return reply({ok:true})}
 }
 if((action==='redeem'?token.role!=='invite':token.role!=='tester'))return reply({error:'Access denied.'},403)
 const pass=await read('passes/'+token.id)
 if(!pass||pass.expiry<=Date.now()||await read('revoked/'+token.id))return reply({error:'This test pass has expired or was revoked.'},403)
 if(action==='redeem')return session('tester',token.id,pass.expiry)
 const statusPath=(f:string)=>'results/'+pass.id+'/'+f
 if(action==='workspace'){const results:Record<string,unknown>={};for(const f of pass.features){results[f]=await read(statusPath(f))||((await read('claims/'+pass.id+'/'+f))?{state:'started'}:null)}return reply({name:pass.name,features:pass.features,results})}
 const f=d.feature;if(!pass.features.includes(f))return reply({error:'Your pass does not include this tool.'},403)
 if(action==='audio'&&f==='voice'){const blob=await get(root+'audio/'+pass.id+'.mp3',{access:'private'});return blob?.statusCode===200?new Response(blob.stream,{headers:{...headers,'Content-Type':'audio/mpeg'}}):reply({error:'Recording unavailable.'},404)}
 if(action==='check'&&['video','photo'].includes(f)){const j=await read(statusPath(f));if(!j?.ref)return reply({error:'No submitted job.'},409)
 if(f==='photo'){const result=await pi('/'+encodeURIComponent(j.ref));return reply({state:result.status,url:resultLink(result.output?.image_url??result.output?.image)})}
 const provider=createVideoProvider(env.FAL_KEY);const s=await provider.status(j.ref);return reply(s.status==='COMPLETED'?{state:s.status,url:resultLink((await provider.result(j.ref)).video?.url)}:{state:s.status})}
 if(action!=='run'||d.confirm!==true)return reply({error:'Confirm this provider test first.'},400)
 const text=typeof d.text==='string'?d.text.trim():'';if(f!=='photo'&&(!text||text.length>500))return reply({error:'Enter up to 500 characters.'},400)
 let source,target;if(f==='photo'){if(d.consent!==true)return reply({error:'Permission from both adults is required.'},400);try{source=await photo(d.source);target=await photo(d.target)}catch{return reply({error:'Choose two valid pictures.'},400)}}
 const voice=f==='voice'?speechInput({text,voice:d.voice,tone:'Natural',speed:1,format:'mp3'}):null
 try{await write('claims/'+pass.id+'/'+f,{time:Date.now()})}catch{return reply({error:'This test is already reserved or storage is unavailable. Refresh to see the result.'},409)}
 let result
 try{
 if(f==='voice'){const r=await renderSpeech(voice,env.OPENAI_API_KEY);if(!r.ok)throw Error();await put(root+'audio/'+pass.id+'.mp3',await r.arrayBuffer(),{access:'private',contentType:'audio/mpeg'});result={state:'ready'}}
 else if(f==='prompt'){const p=await directPrompt({key:env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.5-flash-lite',concept:text,ratio:'16:9',duration:'5'});result={state:'ready',text:p.enhancedPrompt}}
 else if(f==='video'){const ref=await createVideoProvider(env.FAL_KEY).submit({prompt:text,duration:'5',ratio:'16:9'});result={state:'submitted',ref}}
 else{const j=await pi('',{model:'Qubico/image-toolkit',task_type:'multi-face-swap',input:{swap_image:source,target_image:target,swap_faces_index:'0',target_faces_index:'0'}});if(!/^[a-zA-Z0-9-]{1,100}$/.test(j.task_id))throw Error();result={state:'submitted',ref:j.task_id}}
 }catch{result={state:'review',message:'The provider did not return a confirmed result. Ask the owner to review before retrying.'}}
 await write(statusPath(f),result);return reply(result)
 }catch{return reply({error:'The request could not be completed. Please check again.'},503)}
}
