begin;
alter table public.studio_jobs add column request_key uuid, add column provider_result text, add column updated_at timestamptz not null default now(), add unique(owner,request_key);
create table public.studio_video_quotes(id uuid primary key default gen_random_uuid(),owner uuid not null references auth.users,credits integer not null check(credits>0),settings jsonb not null,prompt text not null,expires timestamptz not null default now()+interval '5 minutes');
alter table public.studio_video_quotes enable row level security;
revoke all on public.studio_video_quotes from anon,authenticated;
create function public.studio_accept_video(p_quote uuid,p_owner uuid) returns uuid language plpgsql set search_path='' as $$
declare q public.studio_video_quotes; j uuid; bal bigint; eligible bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
 select id into j from public.studio_jobs where owner=p_owner and request_key=p_quote;
 if found then return j; end if;
 select * into strict q from public.studio_video_quotes where id=p_quote and owner=p_owner and expires>now() for update;
 select coalesce(sum(delta),0),coalesce(sum(delta) filter(where event like 'pay:%' or event like 'reversal:%'),0) into bal,eligible from public.studio_ledger where owner=p_owner;
 if bal<q.credits or eligible<500 then raise exception 'Insufficient credits or membership';end if;
 insert into public.studio_jobs(owner,request_key,prompt,credits,settings,model) values(p_owner,p_quote,q.prompt,q.credits,q.settings,'kling-2.5-pro') returning id into j;
 insert into public.studio_ledger(owner,delta,event) values(p_owner,-q.credits,'reserve:'||j);return j;
end $$;
create function public.studio_claim_job() returns setof public.studio_jobs language sql set search_path='' as $$
 update public.studio_jobs set state='submitting',updated_at=now() where id=(select id from public.studio_jobs where state='queued' order by created_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.studio_claim_job(),public.studio_accept_video(uuid,uuid) from public,anon,authenticated;
grant execute on function public.studio_claim_job(),public.studio_accept_video(uuid,uuid) to service_role;
commit;
