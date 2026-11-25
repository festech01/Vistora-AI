'use client'
import { useState } from 'react'

type Customer = { id: string; email: string; name: string; created: string; confirmed: boolean; paused: boolean }

async function request(data: object) {
  const response = await fetch('/api/admin/accounts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store'
  })
  const result = await response.json()
  if (!response.ok) throw Error(result.error)
  return result
}

export default function CustomerAccounts() {
  const [rows, setRows] = useState<Customer[]>([])
  const [page, setPage] = useState(0), [next, setNext] = useState(false)
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  async function work(fn: () => Promise<void>) {
    setBusy(true); setMessage('')
    try { await fn() } catch (e) { setMessage(e instanceof Error ? e.message : 'Please try again.') }
    finally { setBusy(false) }
  }
  function load(number: number) {
    return work(async () => {
      const result = await request({ action: 'list', page: number })
      setRows(result.users); setNext(result.next); setPage(number)
    })
  }
  function save(id: string, change: object) {
    return work(async () => {
      const result = await request({ id, ...change })
      setRows(list => list.map(row => row.id === id ? result.user : row))
      setMessage('Account updated.')
    })
  }
  return <section><h2>Customer accounts</h2>
    <button disabled={busy} className="outline" onClick={() => load(page || 1)}>{page ? 'Refresh accounts' : 'View accounts'}</button>
    {page > 0 && rows.length === 0 && <p>No customer accounts yet.</p>}
    {rows.map(row => <article key={row.id}><h3>{row.email}</h3><p>{row.paused ? 'Access paused' : row.confirmed ? 'Active' : 'Waiting for email confirmation'}</p>
      <form key={row.name} onSubmit={event => { event.preventDefault(); save(row.id, { action: 'name', name: new FormData(event.currentTarget).get('name') }) }}>
        <label>Display name<input name="name" maxLength={60} defaultValue={row.name}/></label>
        <button disabled={busy} className="outline">Save name</button>
      </form>
      <button disabled={busy} className="text" onClick={() => {
        if (row.paused || window.confirm('Pause studio access for '+row.email+'?')) save(row.id, { action: 'access', paused: !row.paused })
      }}>{row.paused ? 'Restore studio access' : 'Pause studio access'}</button>
    </article>)}
    {page > 1 && <button disabled={busy} onClick={() => load(page - 1)}>Previous page</button>}
    {next && <button disabled={busy} onClick={() => load(page + 1)}>Next page</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
