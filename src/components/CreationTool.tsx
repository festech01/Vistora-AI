'use client'
import {useEffect,useState} from 'react'
import {AudioLines,ScanFace,ScanText,ArrowLeft,ImagePlus} from 'lucide-react'
import {Announcement} from './Community'

const tools={
 photo:{path:'face-swap',name:'Face Swap',intro:'Choose the face to use and the photo you want to change.',action:'Swap face',icon:ScanFace},
 reverse:{path:'reverse-engineer',name:'Reverse Engineer',intro:'Find the hook, structure and call to action in a post. Get an outline for your own version.',action:'Analyze post',icon:ScanText},
 voice:{path:'audio',name:'Audio Studio',intro:'Listen to a voice, adjust the delivery and turn your script into an MP3.',action:'Generate audio',icon:AudioLines}
}
type Feature=keyof typeof tools
type Result={state:string;text?:string;message?:string;ref?:string;url?:string;breakdown?:Record<string,string>}
async function api(action:string,data:object,sponsored:boolean){
 const r=await fetch('/api/testing/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,sponsored}),cache:'no-store'})
 if(action==='audio'&&r.ok)return URL.createObjectURL(await r.blob())
 const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed.');return j
}
async function thumbnail(file:File){
 if(file.size>8e6||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP under 8 MB.')
 const image=await createImageBitmap(file)
 try{
 const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(image.width,image.height))
 canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale))
 canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height)
 return canvas.toDataURL('image/jpeg',0.72)
 }finally{image.close()}
}
export default function CreationTool({feature}:{feature:Feature}){
 const tool=tools[feature],Icon=tool.icon
 const [text,setText]=useState(''),[source,setSource]=useState(''),[target,setTarget]=useState(''),[consent,setConsent]=useState(false)
 const [voice,setVoice]=useState('alloy'),[tone,setTone]=useState('Natural'),[speed,setSpeed]=useState(1)
 const [access,setAccess]=useState<boolean|null>(null),[loading,setLoading]=useState(true),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[note,setNote]=useState('')
 const [result,setResult]=useState<Result|null>(null),[audio,setAudio]=useState('')
 async function findAccess(){
  for(const sponsored of [true,false]){
   const r=await api('workspace',{},sponsored).catch(()=>null)
   if(r?.features?.includes(feature)){setAccess(sponsored);setResult(r.results[feature]);return true}
  }
  return false
 }
 useEffect(()=>{findAccess().finally(()=>setLoading(false))},[feature])
 useEffect(()=>()=>{if(audio)URL.revokeObjectURL(audio)},[audio])
 async function work(fn:()=>Promise<void>){setBusy(true);setNote('');try{await fn()}catch(e){setNote(e instanceof Error?e.message:'Please try again.')}finally{setBusy(false)}}
 function upload(label:string,value:string,set:(s:string)=>void){return <label className="assetWell">{value?<img src={value} alt={label+' preview'}/>:<ImagePlus size={34}/>}<strong>{label}</strong><input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)work(async()=>set(await thumbnail(file)))}}/></label>}
 const valid=feature==='photo'?source&&target&&consent:feature==='reverse'?text.trim()||source:text.trim()
 return <><Announcement/><header className="toolHeader"><a className="logo" href="/"><span className="mark">V</span> Vistora <em>AI</em></a><a href="/tools"><ArrowLeft size={15}/> All tools</a><a href="/workspace">Workspace</a></header>
 <main className={'creationPage '+feature}><aside className="creationNav" aria-label="Creative tools">{(Object.entries(tools) as [Feature,typeof tool][]).map(([key,t])=><a aria-current={key===feature?'page':undefined} key={key} href={'/tools/'+t.path}><t.icon size={19}/>{t.name}</a>)}</aside>
 <div><div className="creationTitle"><Icon size={32}/><h1>{tool.name}</h1><p>{tool.intro}</p></div>
 <div className="creationGrid"><section className="creationInput">
 {feature==='photo'?<><h2>Your photos</h2><div className="assetPair">{upload('Face to use',source,setSource)}{upload('Photo to change',target,setTarget)}</div><label className="photoConsent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Both adults have given me permission to send their photos to PiAPI for this swap.</label></>:
 <><h2>{feature==='voice'?'Your script':'Source material'}</h2><label>{feature==='voice'?'Narration':'Post or video transcript'}<textarea maxLength={feature==='voice'?1800:8000} rows={6} placeholder={feature==='voice'?'Type the words you want to hear…':'Paste the caption, post or spoken words…'} value={text} onChange={e=>setText(e.target.value)}/></label>
 {feature==='reverse'?upload('Optional screenshot',source,setSource):<><div className="voiceSettings"><label>Voice<select value={voice} onChange={e=>setVoice(e.target.value)}>{['alloy','coral','onyx'].map(v=><option key={v}>{v}</option>)}</select></label><label>Tone<select value={tone} onChange={e=>setTone(e.target.value)}>{['Natural','Warm','Calm','Lively'].map(v=><option key={v}>{v}</option>)}</select></label><label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[0.85,1,1.15].map(n=><option key={n} value={n}>{n}×</option>)}</select></label></div><h3>Hear {voice}</h3><p>AI voice sample from OpenAI</p><audio key={voice} controls preload="metadata" src={'/voices/'+voice+'.mp3'}/></>}
 </>}
 {loading?<p>Checking your access…</p>:access===null?<details open className="toolAccess"><summary>Use a test pass or account grant</summary><form onSubmit={e=>{e.preventDefault();work(async()=>{await api('redeem',{code:code.trim()},false);setCode('');if(!await findAccess())throw Error('This pass does not include '+tool.name+'.')})}}><label>Test pass<input required autoComplete="off" type="password" value={code} onChange={e=>setCode(e.target.value)}/></label><button disabled={busy} className="outline">Unlock this tool</button></form><a href={'/workspace?next='+tool.path}>Sign in with a granted account</a></details>:<p>One run is included with this access.</p>}
 <button className="primary" disabled={busy||access===null||!valid||!!result} onClick={()=>work(async()=>{if(!confirm('Use your included run? The studio owner covers provider usage.'))return;const r=await api('run',{feature,text,source,target,screenshot:source,consent,voice,tone,speed,confirm:true},access===true);setResult(r);if(feature==='voice'&&r.state==='ready')setAudio(await api('audio',{feature},access===true))})}>{busy?'Working…':tool.action}</button>{note&&<p role="status" className="notice">{note}</p>}</section>
 <section className="creationResult" aria-live="polite"><h2>{feature==='voice'?'Your recording':feature==='photo'?'Swap result':'Post breakdown'}</h2>{!result?<div className="resultEmpty"><Icon size={38}/><p>{feature==='voice'?'Your generated recording will play here.':feature==='photo'?'Your finished photo will appear here.':'Your analysis and original outline will appear here.'}</p></div>:<><p>{result.state}</p>{result.message&&<p>{result.message}</p>}{result.breakdown&&Object.entries(result.breakdown).map(([k,v])=><article key={k}><h3>{k}</h3><p>{v}</p></article>)}{result.ref&&!result.url&&<button className="outline" disabled={busy} onClick={()=>work(async()=>{const r=await api('check',{feature},access===true);setResult({...result,...r})})}>Check swap result</button>}{result.url&&<><p>Your photo is ready.</p><a href={result.url} target="_blank" rel="noreferrer">Open full image</a></>}{feature==='voice'&&result.state==='ready'&&(audio?<><audio controls src={audio}/><a download="Vistora recording.mp3" href={audio}>Download MP3</a></>:<button className="outline" disabled={busy} onClick={()=>work(async()=>setAudio(await api('audio',{feature},access===true)))}>Load recording</button>)}</>}</section></div></div></main></>
}
