'use client'
import {useEffect,useState} from 'react'
async function call(action:string,message?:string){
 const r=await fetch('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,message})})
 const data=await r.json()
 if(!r.ok)throw Error(data.error)
 return data
}
export function Announcement({countView=false}:{countView?:boolean}){
 const [message,setMessage]=useState('')
 useEffect(()=>{
  let active=true
  const load=()=>fetch('/api/community',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)setMessage(d.message||'')}).catch(()=>{})
  load();const timer=setInterval(load,60000)
  if(countView)call('visit').catch(()=>{})
  return ()=>{active=false;clearInterval(timer)}
 },[countView])
 return message?<aside className="studioBanner" aria-label="Studio announcement"><strong>Studio news</strong><span key={message}>{message}</span></aside>:null
}
type Ticket={id:string;created_at:string;state:string;message:string;reply:string}
export function Support(){
 const [rows,setRows]=useState<Ticket[]>([]),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[text,setText]=useState('')
 useEffect(()=>{call('mine').then(r=>setRows(r.rows)).catch(e=>setNote(e.message))},[])
 return <><h2>Contact the studio</h2><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{const r=await call('send',text);setRows(r.rows);setText('');setNote('Message sent. You can read the owner’s reply here.')}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}}>
 <label>What went wrong?<textarea required maxLength={2000} value={text} onChange={e=>setText(e.target.value)}/></label><button className="primary" disabled={busy}>Send complaint</button></form>
 <p role="status">{note}</p><h3>Your messages</h3>{!rows.length&&<p>No messages yet.</p>}{rows.map(t=><article key={t.id}><small>{new Date(t.created_at).toLocaleDateString()} · {t.state}</small><p>{t.message}</p>{t.reply&&<p><b>Owner reply</b> · {t.reply}</p>}</article>)}</>
}
