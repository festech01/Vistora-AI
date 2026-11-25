begin;
create table public.studio_voice_orders(id uuid primary key default gen_random_uuid(),owner uuid not null references auth.users,input jsonb not null,credits integer not null check(credits>0),state text not null default 'quoted' check(state in ('quoted','processing','ready','refunded')),expires timestamptz not null default now()+interval '5 minutes',created_at timestamptz not null default now());
alter table public.studio_voice_orders enable row level security;
revoke all on public.studio_voice_orders from public,anon,authenticated;
insert into storage.buckets(id,name,public) values ('studio-voice','studio-voice',false) on conflict(id) do nothing;
create function public.studio_claim_voice(p_owner uuid,p_order uuid) returns boolean language plpgsql set search_path='' as $$
declare q public.studio_voice_orders; available bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
 select * into strict q from public.studio_voice_orders where owner=p_owner and id=p_order for update;
 if q.state<>'quoted' then return false; end if;
 if q.expires<=now() then raise exception 'Expired quote'; end if;
 select coalesce(sum(delta),0) into available from public.studio_ledger where owner=p_owner;
 if available<q.credits then raise exception 'Insufficient credits'; end if;
 insert into public.studio_ledger(owner,delta,event) values(p_owner,-q.credits,'voice:'||p_order);
 update public.studio_voice_orders set state='processing' where id=p_order;
 return true;
end $$;
create function public.studio_refund_voice(p_order uuid) returns void language plpgsql set search_path='' as $$
declare q public.studio_voice_orders;
begin
 select * into strict q from public.studio_voice_orders where id=p_order for update;
 if q.state='processing' then
 insert into public.studio_ledger(owner,delta,event) values(q.owner,q.credits,'voice_refund:'||p_order);
 update public.studio_voice_orders set state='refunded' where id=p_order; end if;
end $$;
revoke all on function public.studio_claim_voice(uuid,uuid),public.studio_refund_voice(uuid) from public,anon,authenticated;
grant execute on function public.studio_claim_voice(uuid,uuid),public.studio_refund_voice(uuid) to service_role;
commit;
