// Run on a private host with FFprobe installed. Claim each submission exactly once.
// Use an owner-controlled private Supabase Storage bucket named studio-results.
import {createClient} from '@supabase/supabase-js'
import {createVideoProvider} from '../integrations/fal.mjs'
import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {createWriteStream} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Transform} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const exec=promisify(execFile)
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY)
const provider=createVideoProvider(process.env.FAL_KEY)
async function must(query){const r=await query;if(r.error)throw Error('Database operation failed');return r.data}
async function update(id,changes){await must(db.from('studio_jobs').update({...changes,updated_at:new Date().toISOString()}).eq('id',id))}
async function archive(job,result){
 const url=new URL(result.video.url);if(url.protocol!=='https:'||!/(^|\.)fal\.media$/.test(url.hostname)||url.port||url.username||url.password)throw Error('Unexpected media origin')
 const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)});if(!res.ok||!res.body)throw Error('Media unavailable')
 const dir=await mkdtemp(join(tmpdir(),'vistora-'));const file=join(dir,'output.mp4')
 try{let size=0;await pipeline(res.body,new Transform({transform(chunk,enc,cb){size+=chunk.length;cb(size>32*1024*1024?Error('Size limit'):null,chunk)}}),createWriteStream(file,{flags:'wx'}))
 const {stdout}=await exec('ffprobe',['-protocol_whitelist','file','-v','error','-show_streams','-show_format','-of','json',file],{timeout:10000,maxBuffer:500000});const info=JSON.parse(stdout);const stream=info.streams.find(s=>s.codec_type==='video');if(!stream||!Number.isFinite(Number(info.format.duration))||Math.abs(Number(info.format.duration)-Number(job.settings.duration))>0.75)throw Error('Unexpected media')
 const path=job.owner+'/'+job.id+'.mp4';await must(db.storage.from('studio-results').upload(path,await readFile(file),{contentType:'video/mp4',upsert:true}));return path
 }finally{await rm(dir,{recursive:true,force:true})}}
async function tick(){
 const [job]=await must(db.rpc('studio_claim_job'));if(job){try{const id=await provider.submit({prompt:job.prompt,...job.settings});await update(job.id,{provider_id:id,state:'processing'})}catch{await update(job.id,{state:'reconciliation_required'})}}
 await must(db.from('studio_jobs').update({state:'reconciliation_required'}).eq('state','submitting').lt('updated_at',new Date(Date.now()-600000).toISOString()))
 const jobs=await must(db.from('studio_jobs').select('*').eq('state','processing').order('updated_at').limit(8));for(const j of jobs){try{const s=await provider.status(j.provider_id);if(s.status==='COMPLETED'){const path=await archive(j,await provider.result(j.provider_id));await update(j.id,{state:'completed',provider_result:path})}else await update(j.id,{state:'processing'})}catch{await update(j.id,{state:'reconciliation_required'})}}
}
if(process.env.VIDEO_WORKER_APPROVED!=='true')throw Error('Worker disabled until authorized')
for(;;){try{await tick()}catch{console.error('Worker database or provider unavailable')}await new Promise(r=>setTimeout(r,5000))}
