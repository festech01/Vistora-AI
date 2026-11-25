'use client'
import {useEffect,useState} from 'react'
type Recording={id:string;owner:string;name:string;file:Blob}
async function database():Promise<IDBDatabase>{return new Promise((ok,fail)=>{const req=indexedDB.open('vistoraRecordings',1);req.onupgradeneeded=()=>req.result.createObjectStore('recordings',{keyPath:'id'}).createIndex('owner','owner');req.onsuccess=()=>ok(req.result);req.onerror=()=>fail(req.error)})}
async function library<T>(write:boolean,task:(store:IDBObjectStore)=>IDBRequest<T>){const db=await database();try{return await new Promise<T>((ok,fail)=>{const tx=db.transaction('recordings',write?'readwrite':'readonly');const request=task(tx.objectStore('recordings'));tx.oncomplete=()=>ok(request.result);tx.onabort=()=>fail(tx.error);tx.onerror=()=>fail(tx.error)})}finally{db.close()}}
export default function Recordings({owner,selected='',onSelect}:{owner:string;selected?:string;onSelect?:(id:string)=>void}){
 const [items,setItems]=useState<Recording[]>([]),[active,setActive]=useState(selected),[url,setUrl]=useState(''),[message,setMessage]=useState('')
 useEffect(()=>{let cancelled=false;library(false,s=>s.index('owner').getAll(owner)).then(rows=>{if(!cancelled)setItems(rows)}).catch(()=>setMessage('Recordings could not be loaded on this device.'));return()=>{cancelled=true}},[owner])
 const item=items.find(r=>r.id===active)
 useEffect(()=>{if(!item){setUrl('');return}const u=URL.createObjectURL(item.file);setUrl(u);return()=>URL.revokeObjectURL(u)},[item])
 function choose(id:string){setActive(id);onSelect?.(id)}
 async function add(file?:File){if(!file)return;if(!file.type.startsWith('audio/')||file.size>50*1024*1024){setMessage('Choose an audio file under 50 MB.');return}const r={id:crypto.randomUUID(),owner,name:file.name,file};try{await library(true,s=>s.put(r));setItems(prev=>[...prev,r]);choose(r.id);setMessage('Recording saved on this device.')}catch{setMessage('Could not save the recording. Check your device storage.')}}
 return <div><label>Add a recording<input type="file" accept="audio/*" onChange={e=>{void add(e.target.files?.[0]);e.target.value=''}}/></label>{items.length>0&&<label>Saved recordings<select value={active} onChange={e=>choose(e.target.value)}><option value="">Choose a recording</option>{items.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}{url&&<audio controls src={url}/>}<p role="status">{message}</p></div>
}
