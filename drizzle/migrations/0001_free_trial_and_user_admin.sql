alter table public.saas_subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.saas_subscriptions add column if not exists is_blocked boolean not null default false;
alter table public.saas_subscriptions drop constraint if exists saas_subscriptions_status_check;
alter table public.saas_subscriptions add constraint saas_subscriptions_status_check check (status in ('pending','trial','active','past_due','canceled','refunded','chargeback'));

create or replace function public.has_active_saas_subscription()
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select public.is_superadmin() or exists (
    select 1 from public.saas_subscriptions s
    where s.user_id = auth.uid() and not s.is_blocked
      and ((s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'trial' and s.trial_ends_at > now()))
  );
$$;

create or replace function public.create_pending_saas_subscription()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_plan_id bigint;
begin
  if lower(coalesce(new.email,'')) <> 'conectstore.app@gmail.com' then
    begin v_plan_id := nullif(new.raw_user_meta_data->>'saas_plan_id','')::bigint;
    exception when others then v_plan_id := null;
    end;
    insert into public.saas_subscriptions(user_id,customer_email,plan_id,status,trial_ends_at)
    values (new.id,lower(new.email),v_plan_id,'trial',now() + interval '15 days')
    on conflict (user_id) do update set customer_email=excluded.customer_email;
  end if;
  return new;
end $$;

create or replace function public.email_registered(p_email text)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;
revoke all on function public.email_registered(text) from public;
grant execute on function public.email_registered(text) to anon, authenticated;

grant update on public.saas_subscriptions to authenticated;