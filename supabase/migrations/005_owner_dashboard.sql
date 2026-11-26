create table public.studio_bulletin (
  id boolean primary key default true check (id),
  message text not null default '' check (length(message)<=240),
  published boolean not null default false
);
insert into public.studio_bulletin default values;
create table public.studio_complaints (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  email text not null,
  message text not null check (length(message) between 1 and 2000),
  reply text not null default '' check (length(reply)<=2000),
  state text not null default 'Open' check(state in ('Open','In progress','Resolved')),
  created_at timestamptz not null default now()
);
create index studio_complaints_owner_time on public.studio_complaints(owner, created_at desc);
create table public.studio_views (day date primary key, views bigint not null default 0);
alter table public.studio_views enable row level security;
alter table public.studio_complaints enable row level security;
alter table public.studio_bulletin enable row level security;
revoke all on public.studio_views,public.studio_complaints,public.studio_bulletin from public,anon,authenticated;
grant select,insert,update on public.studio_views,public.studio_complaints to service_role;
grant select,update on public.studio_bulletin to service_role;
create function public.studio_home_view() returns void language sql set search_path='' as $$
 insert into public.studio_views(day,views) values ((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set views=public.studio_views.views+1;
$$;
create function public.studio_owner_metrics() returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object(
 'accounts',(select count(*) from auth.users),
 'verified',(select count(*) from auth.users where email_confirmed_at is not null),
 'complaints',(select count(*) from public.studio_complaints where state<>'Resolved'),
 'grants',(select count(*) from auth.users where (raw_app_meta_data->'studio_grant'->>'expiry')::bigint > extract(epoch from now())*1000 and coalesce(raw_app_meta_data->>'studio_paused','false')<>'true'),
 'days',(select jsonb_agg(jsonb_build_object('day',d,'views',coalesce(v.views,0),'signups',(select count(*) from auth.users u where u.created_at>=d::timestamp at time zone 'UTC' and u.created_at<(d+1)::timestamp at time zone 'UTC')) order by d)
 from (select ((now() at time zone 'UTC')::date-i) d from generate_series(0,6) i) dates left join public.studio_views v on v.day=d));
$$;
revoke all on function public.studio_home_view(),public.studio_owner_metrics() from public,anon,authenticated;
grant execute on function public.studio_home_view(),public.studio_owner_metrics() to service_role;
create function public.studio_customer_search(term text, page_number integer) returns table(id uuid,email text,created timestamptz,confirmed boolean,name text,paused boolean,"grant" jsonb)
language sql stable security definer set search_path='' as $$
 select u.id,u.email::text,u.created_at,u.email_confirmed_at is not null,coalesce(u.raw_user_meta_data->>'display_name',''),coalesce(u.raw_app_meta_data->>'studio_paused','false')='true',u.raw_app_meta_data->'studio_grant'
 from auth.users u where position(lower(term) in lower(u.email))>0
 order by u.created_at desc,u.id offset ((greatest(page_number,1)::bigint-1)*20) limit 21;
$$;
revoke all on function public.studio_customer_search(text,integer) from public,anon,authenticated;
grant execute on function public.studio_customer_search(text,integer) to service_role;
