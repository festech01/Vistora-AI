'use client'
import {useState} from 'react'
export type Reference={name:string;image:string}
export default function References({items,change}:{items:Reference[];change:(items:Reference[])=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function add(files:File[]){setError('');setBusy(true);try{
 if(items.length+files.length>3)throw Error('Choose up to three pictures.')
 const added:Reference[]=[]
 for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('Choose a JPG, PNG or WebP picture under 8 MB.')
 const image=await createImageBitmap(file);try{const scale=Math.min(1,640/Math.max(image.height,image.width));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser could not read the picture.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);added.push({name:file.name,image:canvas.toDataURL('image/jpeg',0.76)})}finally{image.close()}}
 change([...items,...added])
 }catch(e){setError(e instanceof Error?e.message:'Could not read the picture.')}finally{setBusy(false)}}
 return <div className="reference"><label>Reference pictures or graphics<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy||items.length>=3} onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value='';void add(files)}}/></label><p>Choose up to three pictures you have permission to use. They stay in your saved brief.</p><div className="thumbs">{items.map((item,i)=><figure key={i}><img src={item.image} alt={item.name}/><button type="button" onClick={()=>change(items.filter((_,j)=>j!==i))}>Remove {i+1}</button></figure>)}</div>{error&&<p role="alert">{error}</p>}</div>
}
