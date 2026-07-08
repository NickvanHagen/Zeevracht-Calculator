create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('app_password_hash', extensions.crypt('CHANGE_ME_FIRST', extensions.gen_salt('bf')))
on conflict (key) do nothing;

create table if not exists public.rate_files (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  rate_type text not null,
  incoterm text not null,
  file_name text not null,
  validity text,
  exchange_rate numeric(12, 6) not null default 1.144,
  is_active boolean not null default true,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.nvo_lcl_import_rates (
  id uuid primary key default gen_random_uuid(),
  rate_file_id uuid not null references public.rate_files(id) on delete cascade,
  origin_cfs text not null,
  destination_cfs text not null,
  currency text not null,
  rate_wm numeric(12, 4) not null,
  minimum_rate numeric(12, 4) not null,
  transit_time text,
  frequency text,
  created_at timestamptz not null default now()
);

create table if not exists public.nvo_lcl_import_local_charges (
  id uuid primary key default gen_random_uuid(),
  rate_file_id uuid not null references public.rate_files(id) on delete cascade,
  charge_key text not null,
  label text not null,
  currency text not null,
  amount numeric(12, 4) not null,
  basis text,
  created_at timestamptz not null default now()
);

create index if not exists nvo_lcl_import_rates_file_origin_destination_idx
  on public.nvo_lcl_import_rates (rate_file_id, origin_cfs, destination_cfs);

create index if not exists nvo_lcl_import_local_charges_file_key_idx
  on public.nvo_lcl_import_local_charges (rate_file_id, charge_key);

alter table public.rate_files enable row level security;
alter table public.nvo_lcl_import_rates enable row level security;
alter table public.nvo_lcl_import_local_charges enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_no_anon_access" on public.app_settings;
create policy "app_settings_no_anon_access"
  on public.app_settings for select
  to anon
  using (false);

drop policy if exists "rate_files_select_anon" on public.rate_files;
create policy "rate_files_select_anon"
  on public.rate_files for select
  to anon
  using (true);

drop policy if exists "rate_files_insert_anon" on public.rate_files;
drop policy if exists "rate_files_update_anon" on public.rate_files;
drop policy if exists "rate_files_delete_anon" on public.rate_files;

drop policy if exists "nvo_lcl_import_rates_select_anon" on public.nvo_lcl_import_rates;
create policy "nvo_lcl_import_rates_select_anon"
  on public.nvo_lcl_import_rates for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_import_rates_insert_anon" on public.nvo_lcl_import_rates;
drop policy if exists "nvo_lcl_import_rates_update_anon" on public.nvo_lcl_import_rates;
drop policy if exists "nvo_lcl_import_rates_delete_anon" on public.nvo_lcl_import_rates;

drop policy if exists "nvo_lcl_import_local_charges_select_anon" on public.nvo_lcl_import_local_charges;
create policy "nvo_lcl_import_local_charges_select_anon"
  on public.nvo_lcl_import_local_charges for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_import_local_charges_insert_anon" on public.nvo_lcl_import_local_charges;
drop policy if exists "nvo_lcl_import_local_charges_update_anon" on public.nvo_lcl_import_local_charges;
drop policy if exists "nvo_lcl_import_local_charges_delete_anon" on public.nvo_lcl_import_local_charges;

create or replace function public.verify_tff_app_password(p_app_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.app_settings
    where key = 'app_password_hash'
      and value = extensions.crypt(p_app_password, value)
  );
$$;

revoke all on function public.verify_tff_app_password(text) from public;
revoke all on function public.verify_tff_app_password(text) from anon;

create or replace function public.replace_nvo_lcl_import_rates(
  p_app_password text,
  p_file_name text,
  p_validity text,
  p_exchange_rate numeric,
  p_rates jsonb,
  p_local_charges jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rate_file_id uuid;
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor tarievenbeheer' using errcode = '28000';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Rate of exchange moet groter zijn dan 0';
  end if;

  update public.rate_files
  set is_active = false
  where provider = 'NVO'
    and rate_type = 'lcl_import'
    and incoterm = 'FOB'
    and is_active = true;

  insert into public.rate_files (
    provider,
    rate_type,
    incoterm,
    file_name,
    validity,
    exchange_rate,
    is_active
  )
  values (
    'NVO',
    'lcl_import',
    'FOB',
    p_file_name,
    nullif(p_validity, ''),
    p_exchange_rate,
    true
  )
  returning id into v_rate_file_id;

  insert into public.nvo_lcl_import_rates (
    rate_file_id,
    origin_cfs,
    destination_cfs,
    currency,
    rate_wm,
    minimum_rate,
    transit_time,
    frequency
  )
  select
    v_rate_file_id,
    origin_cfs,
    destination_cfs,
    upper(currency),
    rate_wm,
    minimum_rate,
    transit_time,
    frequency
  from jsonb_to_recordset(p_rates) as rate_rows (
    origin_cfs text,
    destination_cfs text,
    currency text,
    rate_wm numeric,
    minimum_rate numeric,
    transit_time text,
    frequency text
  )
  where origin_cfs is not null
    and destination_cfs is not null
    and rate_wm is not null
    and rate_wm > 0;

  insert into public.nvo_lcl_import_local_charges (
    rate_file_id,
    charge_key,
    label,
    currency,
    amount,
    basis
  )
  select
    v_rate_file_id,
    charge_key,
    label,
    upper(currency),
    amount,
    basis
  from jsonb_to_recordset(p_local_charges) as charge_rows (
    charge_key text,
    label text,
    currency text,
    amount numeric,
    basis text
  )
  where charge_key is not null
    and label is not null
    and amount is not null;

  return v_rate_file_id;
end;
$$;

create or replace function public.update_nvo_lcl_import_exchange_rate(
  p_app_password text,
  p_rate_file_id uuid,
  p_exchange_rate numeric
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor tarievenbeheer' using errcode = '28000';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Rate of exchange moet groter zijn dan 0';
  end if;

  update public.rate_files
  set exchange_rate = p_exchange_rate
  where id = p_rate_file_id
    and provider = 'NVO'
    and rate_type = 'lcl_import'
    and incoterm = 'FOB';
end;
$$;

revoke all on function public.replace_nvo_lcl_import_rates(text, text, text, numeric, jsonb, jsonb) from public;
revoke all on function public.update_nvo_lcl_import_exchange_rate(text, uuid, numeric) from public;
grant execute on function public.replace_nvo_lcl_import_rates(text, text, text, numeric, jsonb, jsonb) to anon;
grant execute on function public.update_nvo_lcl_import_exchange_rate(text, uuid, numeric) to anon;
