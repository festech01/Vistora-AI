'use client'
import {useEffect,useState} from 'react'
import {LayoutDashboard,Users,Inbox,Megaphone,Ticket} from 'lucide-react'
const sections=['Overview','Accounts','Complaints','Announcements','Test passes']
const icons=[LayoutDashboard,Users,Inbox,Megaphone,Ticket]
import CustomerAccounts,{request} from './CustomerAccounts'
type Metrics={accounts:number;verified:number;complaints:number;grants:number;days:{day:string;views:number;signups:number}[]}
type Ticket={id:string;email:string;message:string;reply:string;state:string;created_at:string}
export default function OwnerDesk({children}:{children:React.ReactNode}){
 const [tab,setTab]=useState('Overview'),[metrics,setMetrics]=useState<Metrics|null>(null),[text,setText]=useState(''),[published,setPublished]=useState(false),[note,setNote]=useState(''),[busy,setBusy]=useState(false)
 const [tickets,setTickets]=useState<Ticket[]>([]),[page,setPage]=useState(1),[next,setNext]=useState(false)
 useEffect(()=>{const sync=()=>{const name=new URLSearchParams(location.search).get('section')||'Overview';setTab(sections.includes(name)?name:'Overview')};sync();window.addEventListener('popstate',sync);return ()=>window.removeEventListener('popstate',sync)},[])
 async function load(){
  if(tab==='Complaints'){const r=await request({action:'inbox',page});setTickets(r.rows);setNext(r.next)}
  if(tab==='Overview'||tab==='Announcements'){const r=await request({action:'overview'});setMetrics(r.metrics);setText(r.banner.message);setPublished(r.banner.published)}
 }
 useEffect(()=>{setNote('');load().catch(e=>setNote(e.message))},[tab,page])
 async function save(data:object,success:string){setBusy(true);try{await request(data);await load();setNote(success)}catch(e){setNote((e as Error).message)}finally{setBusy(false)}}
 const days=metrics?.days||[]
 return <div className="ownerDesk"><aside className="ownerRail"><strong>Studio management</strong>{sections.map((t,i)=>{const Icon=icons[i];return <a key={t} href={'/admin?section='+encodeURIComponent(t)} aria-current={tab===t?'page':undefined} onClick={e=>{e.preventDefault();history.pushState(null,'','/admin?section='+encodeURIComponent(t));setTab(t)}}><Icon size={18}/>{t}</a>})}<a href="/">View website ↗</a></aside><div className="ownerBody">
 {tab==='Overview'&&<section><div className="deskHeading"><h2>Studio activity</h2><button className="outline" onClick={()=>load().catch(e=>setNote(e.message))}>Refresh</button></div>
 {metrics?<><div className="deskMetrics">{[['Customer accounts',metrics.accounts],['Verified emails',metrics.verified],['Active free grants',metrics.grants],['Unresolved complaints',metrics.complaints]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
 <h3>Last seven days</h3><p>Home page views count visits and reloads from the start of tracking. Dates use UTC.</p><table><thead><tr><th>Date</th><th>Home page views</th><th>Signups</th></tr></thead><tbody>{days.map(d=><tr key={d.day}><td>{d.day}</td><td>{d.views}</td><td>{d.signups}</td></tr>)}</tbody></table></>:<p>Loading activity…</p>}</section>}
 {tab==='Accounts'&&<CustomerAccounts/>}
 {tab==='Announcements'&&<section><h2>Website announcement</h2><p>{published?'Published on the website.':'The website banner is hidden.'}</p><label>Message<textarea maxLength={240} value={text} onChange={e=>setText(e.target.value)}/></label><small>{text.length} / 240</small>
 {text&&<aside className="studioBanner"><strong>Preview</strong><span>{text}</span></aside>}<div className="actions"><button className="primary" disabled={busy||!text.trim()} onClick={()=>save({action:'banner',message:text,published:true},'Announcement published.')}>Publish announcement</button><button className="outline" disabled={busy||!published} onClick={()=>save({action:'banner',message:text,published:false},'Announcement hidden.')}>Hide banner</button></div></section>}
 {tab==='Complaints'&&<section><h2>Complaint inbox</h2>{!tickets.length&&<p>No complaints on this page.</p>}{tickets.map(t=><article key={t.id}><strong>{t.email}</strong><p>{new Date(t.created_at).toLocaleString()} · {t.state}</p><p>{t.message}</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save({action:'respond',id:t.id,reply:f.get('reply'),state:f.get('state')},'Complaint updated. The customer can see your reply.')}}><label>Reply to customer<textarea name="reply" maxLength={2000} defaultValue={t.reply}/></label><label>Status <select name="state" defaultValue={t.state}>{['Open','In progress','Resolved'].map(s=><option key={s}>{s}</option>)}</select></label><button className="outline" disabled={busy}>Save response</button></form></article>)}{page>1&&<button onClick={()=>setPage(page-1)}>Previous page</button>}{next&&<button onClick={()=>setPage(page+1)}>Next page</button>}</section>}
 {tab==='Test passes'&&children}{note&&<p className="notice" role="status">{note}</p>}</div></div>
}
