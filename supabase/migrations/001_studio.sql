begin;
create table public.studio_orders(id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users, credits integer not null check(credits in(100,500,1500,3000)), amount integer generated always as (credits*1000) stored, currency text not null default 'NGN' check(currency='NGN'), state text not null default 'quoted' check(state in('quoted','pending','paid')), expires timestamptz not null default now()+interval '10 minutes', provider_id text unique);
create table public.studio_ledger(id uuid primary key default gen_random_uuid(), owner uuid not null references auth.users, delta integer not null, event text not null unique, created_at timestamptz not null default now());
create table public.studio_jobs(id uuid primary key default gen_random_uuid(),owner uuid not null references auth.users, state text not null default 'queued', prompt text not null, credits integer not null check(credits>0), model text not null, settings jsonb not null, provider_id text, created_at timestamptz not null default now());
alter table public.studio_orders enable row level security;
alter table public.studio_ledger enable row level security;
alter table public.studio_jobs enable row level security;
revoke all on public.studio_orders,public.studio_ledger,public.studio_jobs from anon,authenticated;
grant select on public.studio_orders,public.studio_jobs,public.studio_ledger to authenticated;
create policy own_orders on public.studio_orders for select to authenticated using(owner=auth.uid());
create policy own_jobs on public.studio_jobs for select to authenticated using(owner=auth.uid());
create policy own_entries on public.studio_ledger for select to authenticated using(owner=auth.uid());
create function public.settle_studio_payment(p_order uuid,p_transaction text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.studio_orders;
begin
 select * into strict o from public.studio_orders where id=p_order for update;
 if o.state='paid' and o.provider_id=p_transaction then return; end if;
 if o.state<>'pending' then raise exception 'Invalid order state'; end if;
 insert into public.studio_ledger(owner,delta,event) values(o.owner,o.credits,'pay:'||o.id);
 update public.studio_orders set state='paid',provider_id=p_transaction where id=o.id;
end $$;
revoke all on function public.settle_studio_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.settle_studio_payment(uuid,text) to service_role;
commit;
