'use client'
import { useState,useEffect } from 'react'

type Customer = { id: string; email: string; name: string; created: string; confirmed: boolean; paused: boolean; grant:{features:string[];expiry:number}|null }

export async function request(data: object) {
  const response = await fetch('/api/admin/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store'
  })
  const result = await response.json()
  if (!response.ok) throw Error(result.error)
  return result
}

export default function CustomerAccounts() {
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('')
  const [rows, setRows] = useState<Customer[]>([])
  const [page, setPage] = useState(0), [next, setNext] = useState(false)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function work(fn: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await fn() } catch (e) { setMessage(e instanceof Error ? e.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  function load(number: number,search=filter) {
    return work(async () => {
      const result = await request({ action: 'list', page: number,search })
      setFilter(search);setRows(result.users); setNext(result.next); setPage(number)
    })
  }
  useEffect(()=>{load(1)},[])
  function save(id: string, change: object) {
    return work(async () => {
      const result = await request({ id, ...change })
      setRows(list => list.map(row => row.id === id ? result.user : row))
      setMessage('Account updated.')
    })
  }
  return <section><h2>Customer accounts</h2>
    <form onSubmit={e=>{e.preventDefault();load(1,query)}}><label>Find a customer by email<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Enter all or part of an email"/></label><button disabled={busy} className="primary">Search accounts</button></form>
    <button disabled={busy} className="outline" onClick={() => load(page || 1)}>{page ? 'Refresh accounts' : 'View accounts'}</button>
    {page > 0 && rows.length === 0 && <p>No customer accounts found.</p>}
    {rows.map(row => <article key={row.id}><h3>{row.email}</h3><p>{row.paused ? 'Access paused' : row.confirmed ? 'Active' : 'Waiting for email confirmation'}</p>
      <form key={row.name} onSubmit={event => { event.preventDefault(); save(row.id, { action: 'name', name: new FormData(event.currentTarget).get('name') }) }}>
        <label>Display name<input name="name" maxLength={60} defaultValue={row.name}/></label>
        <button disabled={busy} className="outline">Save name</button>
      </form>
      <p>Joined {new Date(row.created).toLocaleDateString()}</p>
      <details><summary>Free feature access</summary>
        {row.grant&&<p>{row.grant.features.join(', ')} · Ends {new Date(row.grant.expiry).toLocaleString()}</p>}
        <form onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);if(window.confirm('Give one free use of each selected tool? Your provider account covers the cost.'))save(row.id,{action:'grant',features:f.getAll('feature'),days:Number(f.get('days'))})}}>
          <p>Choose one free use of each tool. A new grant replaces the previous allowance.</p>
          {[['prompt','Scene writer'],['voice','Voice recording'],['photo','Photo face swap'],['video','Five second video']].map(([key,label])=><label className="choice" key={key}><input type="checkbox" name="feature" value={key}/>{label}</label>)}
          <label>Expires in <select name="days" defaultValue="7"><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label>
          <button disabled={busy||row.paused} className="outline">Grant free access</button>
        </form>
        {row.grant&&<button disabled={busy} onClick={()=>save(row.id,{action:'removeGrant'})}>Remove free access</button>}
      </details>
      <button disabled={busy} className="text" onClick={() => {
        if (row.paused || window.confirm('Pause studio access for '+row.email+'?')) save(row.id, { action: 'access', paused: !row.paused })
      }}>{row.paused ? 'Restore studio access' : 'Pause studio access'}</button>
    </article>)}
    {page > 1 && <button disabled={busy} onClick={() => load(page - 1)}>Previous page</button>}
    {next && <button disabled={busy} onClick={() => load(page + 1)}>Next page</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
