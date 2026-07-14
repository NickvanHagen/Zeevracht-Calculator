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

create table if not exists public.nvo_lcl_export_rates (
  id uuid primary key default gen_random_uuid(),
  rate_file_id uuid not null references public.rate_files(id) on delete cascade,
  region text,
  country text not null,
  destination_unlo text,
  destination_cfs text not null,
  transshipment text,
  origin_cfs text not null,
  currency text not null,
  rate_wm numeric(12, 4) not null,
  minimum_rate numeric(12, 4) not null,
  frequency text,
  transit_time text,
  collect text,
  imo text,
  remark text,
  created_at timestamptz not null default now()
);

create table if not exists public.nvo_lcl_export_charges (
  id uuid primary key default gen_random_uuid(),
  rate_file_id uuid not null references public.rate_files(id) on delete cascade,
  charge_key text not null,
  label text not null,
  country text,
  currency text not null,
  amount numeric(12, 4) not null,
  basis text,
  created_at timestamptz not null default now()
);

create index if not exists nvo_lcl_import_rates_file_origin_destination_idx
  on public.nvo_lcl_import_rates (rate_file_id, origin_cfs, destination_cfs);

create index if not exists nvo_lcl_import_local_charges_file_key_idx
  on public.nvo_lcl_import_local_charges (rate_file_id, charge_key);

create index if not exists nvo_lcl_export_rates_file_destination_idx
  on public.nvo_lcl_export_rates (rate_file_id, destination_cfs);

create index if not exists nvo_lcl_export_charges_file_key_idx
  on public.nvo_lcl_export_charges (rate_file_id, charge_key);

create index if not exists nvo_lcl_export_charges_file_country_idx
  on public.nvo_lcl_export_charges (rate_file_id, country);

create sequence if not exists public.saved_quote_number_seq;

create table if not exists public.saved_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique default (
    'TFF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.saved_quote_number_seq')::text, 5, '0')
  ),
  mode text not null check (mode in ('lcl', 'fcl')),
  direction text not null check (direction in ('import', 'export')),
  customer_name text not null,
  tff_reference text,
  customer_reference text,
  incoterms text not null,
  loading_place text,
  unloading_place text,
  validity text not null,
  purchase_price numeric(12, 2) not null default 0,
  margin_percentage numeric(8, 4) not null default 0,
  sales_price numeric(12, 2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_by_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_quotes_created_at_idx
  on public.saved_quotes (created_at desc);

create index if not exists saved_quotes_customer_name_idx
  on public.saved_quotes (customer_name);

alter table public.rate_files enable row level security;
alter table public.nvo_lcl_import_rates enable row level security;
alter table public.nvo_lcl_import_local_charges enable row level security;
alter table public.nvo_lcl_export_rates enable row level security;
alter table public.nvo_lcl_export_charges enable row level security;
alter table public.app_settings enable row level security;
alter table public.saved_quotes enable row level security;

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

drop policy if exists "nvo_lcl_export_rates_select_anon" on public.nvo_lcl_export_rates;
create policy "nvo_lcl_export_rates_select_anon"
  on public.nvo_lcl_export_rates for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_export_rates_insert_anon" on public.nvo_lcl_export_rates;
drop policy if exists "nvo_lcl_export_rates_update_anon" on public.nvo_lcl_export_rates;
drop policy if exists "nvo_lcl_export_rates_delete_anon" on public.nvo_lcl_export_rates;

drop policy if exists "nvo_lcl_export_charges_select_anon" on public.nvo_lcl_export_charges;
create policy "nvo_lcl_export_charges_select_anon"
  on public.nvo_lcl_export_charges for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_export_charges_insert_anon" on public.nvo_lcl_export_charges;
drop policy if exists "nvo_lcl_export_charges_update_anon" on public.nvo_lcl_export_charges;
drop policy if exists "nvo_lcl_export_charges_delete_anon" on public.nvo_lcl_export_charges;

drop policy if exists "saved_quotes_select_anon" on public.saved_quotes;
drop policy if exists "saved_quotes_insert_anon" on public.saved_quotes;
drop policy if exists "saved_quotes_update_anon" on public.saved_quotes;
drop policy if exists "saved_quotes_delete_anon" on public.saved_quotes;

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

create or replace function public.replace_nvo_lcl_export_rates(
  p_app_password text,
  p_file_name text,
  p_validity text,
  p_exchange_rate numeric,
  p_rates jsonb,
  p_charges jsonb
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
    and rate_type = 'lcl_export'
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
    'lcl_export',
    'FOB',
    p_file_name,
    nullif(p_validity, ''),
    p_exchange_rate,
    true
  )
  returning id into v_rate_file_id;

  insert into public.nvo_lcl_export_rates (
    rate_file_id,
    region,
    country,
    destination_unlo,
    destination_cfs,
    transshipment,
    origin_cfs,
    currency,
    rate_wm,
    minimum_rate,
    frequency,
    transit_time,
    collect,
    imo,
    remark
  )
  select
    v_rate_file_id,
    region,
    country,
    destination_unlo,
    destination_cfs,
    transshipment,
    origin_cfs,
    upper(currency),
    rate_wm,
    minimum_rate,
    frequency,
    transit_time,
    collect,
    imo,
    remark
  from jsonb_to_recordset(p_rates) as rate_rows (
    region text,
    country text,
    destination_unlo text,
    destination_cfs text,
    transshipment text,
    origin_cfs text,
    currency text,
    rate_wm numeric,
    minimum_rate numeric,
    frequency text,
    transit_time text,
    collect text,
    imo text,
    remark text
  )
  where country is not null
    and destination_cfs is not null
    and origin_cfs is not null
    and rate_wm is not null
    and rate_wm > 0;

  insert into public.nvo_lcl_export_charges (
    rate_file_id,
    charge_key,
    label,
    country,
    currency,
    amount,
    basis
  )
  select
    v_rate_file_id,
    charge_key,
    label,
    country,
    upper(currency),
    amount,
    basis
  from jsonb_to_recordset(p_charges) as charge_rows (
    charge_key text,
    label text,
    country text,
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

create or replace function public.update_nvo_lcl_export_exchange_rate(
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
    and rate_type = 'lcl_export'
    and incoterm = 'FOB';
end;
$$;

drop function if exists public.save_lcl_quote(text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb);
drop function if exists public.save_lcl_quote(text, uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb);
create or replace function public.save_lcl_quote(
  p_app_password text,
  p_quote_id uuid,
  p_direction text,
  p_customer_name text,
  p_tff_reference text,
  p_customer_reference text,
  p_incoterms text,
  p_loading_place text,
  p_unloading_place text,
  p_validity text,
  p_purchase_price numeric,
  p_margin_percentage numeric,
  p_sales_price numeric,
  p_payload jsonb
)
returns table (
  id uuid,
  quote_number text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_quote_id uuid;
  v_quote_number text;
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor offertes' using errcode = '28000';
  end if;

  if nullif(trim(p_customer_name), '') is null then
    raise exception 'Klantnaam is verplicht';
  end if;

  if p_quote_id is not null then
    update public.saved_quotes
    set
      direction = p_direction,
      customer_name = trim(p_customer_name),
      tff_reference = nullif(trim(coalesce(p_tff_reference, '')), ''),
      customer_reference = nullif(trim(coalesce(p_customer_reference, '')), ''),
      incoterms = p_incoterms,
      loading_place = nullif(trim(coalesce(p_loading_place, '')), ''),
      unloading_place = nullif(trim(coalesce(p_unloading_place, '')), ''),
      validity = p_validity,
      purchase_price = coalesce(p_purchase_price, 0),
      margin_percentage = coalesce(p_margin_percentage, 0),
      sales_price = coalesce(p_sales_price, 0),
      payload = coalesce(p_payload, '{}'::jsonb),
      updated_at = now()
    where public.saved_quotes.id = p_quote_id
      and public.saved_quotes.mode = 'lcl'
    returning public.saved_quotes.id, public.saved_quotes.quote_number into v_quote_id, v_quote_number;

    if v_quote_id is null then
      raise exception 'Offerte niet gevonden';
    end if;

    return query select v_quote_id, v_quote_number;
    return;
  end if;

  insert into public.saved_quotes (
    mode,
    direction,
    customer_name,
    tff_reference,
    customer_reference,
    incoterms,
    loading_place,
    unloading_place,
    validity,
    purchase_price,
    margin_percentage,
    sales_price,
    payload,
    created_by
  )
  values (
    'lcl',
    p_direction,
    trim(p_customer_name),
    nullif(trim(coalesce(p_tff_reference, '')), ''),
    nullif(trim(coalesce(p_customer_reference, '')), ''),
    p_incoterms,
    nullif(trim(coalesce(p_loading_place, '')), ''),
    nullif(trim(coalesce(p_unloading_place, '')), ''),
    p_validity,
    coalesce(p_purchase_price, 0),
    coalesce(p_margin_percentage, 0),
    coalesce(p_sales_price, 0),
    coalesce(p_payload, '{}'::jsonb),
    null
  )
  returning public.saved_quotes.id, public.saved_quotes.quote_number into v_quote_id, v_quote_number;

  return query select v_quote_id, v_quote_number;
end;
$$;

drop function if exists public.list_saved_quotes(text);
create or replace function public.list_saved_quotes(p_app_password text)
returns table (
  id uuid,
  quote_number text,
  mode text,
  direction text,
  customer_name text,
  tff_reference text,
  customer_reference text,
  incoterms text,
  loading_place text,
  unloading_place text,
  validity text,
  purchase_price numeric,
  margin_percentage numeric,
  sales_price numeric,
  payload jsonb,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor offertes' using errcode = '28000';
  end if;

  return query
  select
    saved_quotes.id,
    saved_quotes.quote_number,
    saved_quotes.mode,
    saved_quotes.direction,
    saved_quotes.customer_name,
    saved_quotes.tff_reference,
    saved_quotes.customer_reference,
    saved_quotes.incoterms,
    saved_quotes.loading_place,
    saved_quotes.unloading_place,
    saved_quotes.validity,
    saved_quotes.purchase_price,
    saved_quotes.margin_percentage,
    saved_quotes.sales_price,
    saved_quotes.payload,
    saved_quotes.created_by,
    saved_quotes.created_at
  from public.saved_quotes
  order by saved_quotes.created_at desc
  limit 250;
end;
$$;

drop function if exists public.get_saved_quote(text, uuid);
create or replace function public.get_saved_quote(
  p_app_password text,
  p_quote_id uuid
)
returns table (
  id uuid,
  quote_number text,
  mode text,
  direction text,
  customer_name text,
  tff_reference text,
  customer_reference text,
  incoterms text,
  loading_place text,
  unloading_place text,
  validity text,
  purchase_price numeric,
  margin_percentage numeric,
  sales_price numeric,
  payload jsonb,
  created_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor offertes' using errcode = '28000';
  end if;

  return query
  select
    saved_quotes.id,
    saved_quotes.quote_number,
    saved_quotes.mode,
    saved_quotes.direction,
    saved_quotes.customer_name,
    saved_quotes.tff_reference,
    saved_quotes.customer_reference,
    saved_quotes.incoterms,
    saved_quotes.loading_place,
    saved_quotes.unloading_place,
    saved_quotes.validity,
    saved_quotes.purchase_price,
    saved_quotes.margin_percentage,
    saved_quotes.sales_price,
    saved_quotes.payload,
    saved_quotes.created_by,
    saved_quotes.created_at
  from public.saved_quotes
  where saved_quotes.id = p_quote_id
    and saved_quotes.mode = 'lcl'
  limit 1;
end;
$$;

drop function if exists public.delete_saved_quote(text, uuid);
create or replace function public.delete_saved_quote(
  p_app_password text,
  p_quote_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_tff_app_password(p_app_password) then
    raise exception 'Onjuist wachtwoord voor offertes' using errcode = '28000';
  end if;

  delete from public.saved_quotes
  where id = p_quote_id;
end;
$$;

revoke all on function public.replace_nvo_lcl_import_rates(text, text, text, numeric, jsonb, jsonb) from public;
revoke all on function public.update_nvo_lcl_import_exchange_rate(text, uuid, numeric) from public;
revoke all on function public.replace_nvo_lcl_export_rates(text, text, text, numeric, jsonb, jsonb) from public;
revoke all on function public.update_nvo_lcl_export_exchange_rate(text, uuid, numeric) from public;
revoke all on function public.save_lcl_quote(text, uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb) from public;
revoke all on function public.list_saved_quotes(text) from public;
revoke all on function public.get_saved_quote(text, uuid) from public;
revoke all on function public.delete_saved_quote(text, uuid) from public;
grant execute on function public.replace_nvo_lcl_import_rates(text, text, text, numeric, jsonb, jsonb) to anon;
grant execute on function public.update_nvo_lcl_import_exchange_rate(text, uuid, numeric) to anon;
grant execute on function public.replace_nvo_lcl_export_rates(text, text, text, numeric, jsonb, jsonb) to anon;
grant execute on function public.update_nvo_lcl_export_exchange_rate(text, uuid, numeric) to anon;
grant execute on function public.save_lcl_quote(text, uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb) to anon;
grant execute on function public.list_saved_quotes(text) to anon;
grant execute on function public.get_saved_quote(text, uuid) to anon;
grant execute on function public.delete_saved_quote(text, uuid) to anon;

-- 2026-07-14: Per-user Supabase Auth login for TFF users.
-- Run the full file in Supabase SQL Editor. Existing shared-password functions are revoked below.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_tff_email_check check (lower(email) like '%@tfflogistics.com'),
  constraint profiles_full_name_check check (length(trim(full_name)) > 0)
);

alter table public.saved_quotes
  add column if not exists created_by_label text;

update public.rate_files
set incoterm = 'CFR'
where provider = 'NVO'
  and rate_type = 'lcl_export'
  and incoterm = 'FOB';

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and lower(email) like '%@tfflogistics.com' and length(trim(full_name)) > 0);

drop policy if exists "rate_files_select_anon" on public.rate_files;
drop policy if exists "rate_files_select_authenticated" on public.rate_files;
create policy "rate_files_select_authenticated"
  on public.rate_files for select
  to authenticated
  using (true);

drop policy if exists "nvo_lcl_import_rates_select_anon" on public.nvo_lcl_import_rates;
drop policy if exists "nvo_lcl_import_rates_select_authenticated" on public.nvo_lcl_import_rates;
create policy "nvo_lcl_import_rates_select_authenticated"
  on public.nvo_lcl_import_rates for select
  to authenticated
  using (true);

drop policy if exists "nvo_lcl_import_local_charges_select_anon" on public.nvo_lcl_import_local_charges;
drop policy if exists "nvo_lcl_import_local_charges_select_authenticated" on public.nvo_lcl_import_local_charges;
create policy "nvo_lcl_import_local_charges_select_authenticated"
  on public.nvo_lcl_import_local_charges for select
  to authenticated
  using (true);

drop policy if exists "nvo_lcl_export_rates_select_anon" on public.nvo_lcl_export_rates;
drop policy if exists "nvo_lcl_export_rates_select_authenticated" on public.nvo_lcl_export_rates;
create policy "nvo_lcl_export_rates_select_authenticated"
  on public.nvo_lcl_export_rates for select
  to authenticated
  using (true);

drop policy if exists "nvo_lcl_export_charges_select_anon" on public.nvo_lcl_export_charges;
drop policy if exists "nvo_lcl_export_charges_select_authenticated" on public.nvo_lcl_export_charges;
create policy "nvo_lcl_export_charges_select_authenticated"
  on public.nvo_lcl_export_charges for select
  to authenticated
  using (true);

create or replace function public.handle_new_tff_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_full_name text;
begin
  if new.email is null or lower(new.email) not like '%@tfflogistics.com' then
    raise exception 'Alleen @tfflogistics.com e-mailadressen kunnen een account maken';
  end if;

  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');

  if v_full_name is null then
    raise exception 'Naam is verplicht';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), v_full_name)
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_tff_profile on auth.users;
create trigger on_auth_user_created_tff_profile
  after insert on auth.users
  for each row execute function public.handle_new_tff_user();

create or replace function public.current_tff_user_id()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_full_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Niet ingelogd' using errcode = '28000';
  end if;

  select lower(email), nullif(trim(coalesce(raw_user_meta_data->>'full_name', '')), '')
  into v_email, v_full_name
  from auth.users
  where id = v_user_id;

  if v_email is null or v_email not like '%@tfflogistics.com' then
    raise exception 'Alleen TFF gebruikers hebben toegang' using errcode = '28000';
  end if;

  insert into public.profiles (id, email, full_name)
  values (v_user_id, v_email, coalesce(v_full_name, v_email))
  on conflict (id) do nothing;

  return v_user_id;
end;
$$;

create or replace function public.current_tff_user_label()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select nullif(trim(full_name), '') from public.profiles where id = public.current_tff_user_id()),
    (select email from public.profiles where id = public.current_tff_user_id()),
    'TFF gebruiker'
  );
$$;

drop function if exists public.replace_nvo_lcl_import_rates(text, text, text, numeric, jsonb, jsonb);
create or replace function public.replace_nvo_lcl_import_rates(
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
  perform public.current_tff_user_id();

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Rate of exchange moet groter zijn dan 0';
  end if;

  update public.rate_files
  set is_active = false
  where provider = 'NVO'
    and rate_type = 'lcl_import'
    and incoterm = 'FOB'
    and is_active = true;

  insert into public.rate_files (provider, rate_type, incoterm, file_name, validity, exchange_rate, is_active)
  values ('NVO', 'lcl_import', 'FOB', p_file_name, nullif(p_validity, ''), p_exchange_rate, true)
  returning id into v_rate_file_id;

  insert into public.nvo_lcl_import_rates (
    rate_file_id, origin_cfs, destination_cfs, currency, rate_wm, minimum_rate, transit_time, frequency
  )
  select
    v_rate_file_id, origin_cfs, destination_cfs, upper(currency), rate_wm, minimum_rate, transit_time, frequency
  from jsonb_to_recordset(p_rates) as rate_rows (
    origin_cfs text, destination_cfs text, currency text, rate_wm numeric,
    minimum_rate numeric, transit_time text, frequency text
  )
  where origin_cfs is not null and destination_cfs is not null and rate_wm is not null and rate_wm > 0;

  insert into public.nvo_lcl_import_local_charges (
    rate_file_id, charge_key, label, currency, amount, basis
  )
  select
    v_rate_file_id, charge_key, label, upper(currency), amount, basis
  from jsonb_to_recordset(p_local_charges) as charge_rows (
    charge_key text, label text, currency text, amount numeric, basis text
  )
  where charge_key is not null and label is not null and amount is not null;

  return v_rate_file_id;
end;
$$;

drop function if exists public.update_nvo_lcl_import_exchange_rate(text, uuid, numeric);
create or replace function public.update_nvo_lcl_import_exchange_rate(
  p_rate_file_id uuid,
  p_exchange_rate numeric
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.current_tff_user_id();

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

drop function if exists public.replace_nvo_lcl_export_rates(text, text, text, numeric, jsonb, jsonb);
create or replace function public.replace_nvo_lcl_export_rates(
  p_file_name text,
  p_validity text,
  p_exchange_rate numeric,
  p_rates jsonb,
  p_charges jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rate_file_id uuid;
begin
  perform public.current_tff_user_id();

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Rate of exchange moet groter zijn dan 0';
  end if;

  update public.rate_files
  set is_active = false
  where provider = 'NVO'
    and rate_type = 'lcl_export'
    and incoterm = 'CFR'
    and is_active = true;

  insert into public.rate_files (provider, rate_type, incoterm, file_name, validity, exchange_rate, is_active)
  values ('NVO', 'lcl_export', 'CFR', p_file_name, nullif(p_validity, ''), p_exchange_rate, true)
  returning id into v_rate_file_id;

  insert into public.nvo_lcl_export_rates (
    rate_file_id, region, country, destination_unlo, destination_cfs, transshipment,
    origin_cfs, currency, rate_wm, minimum_rate, frequency, transit_time, collect, imo, remark
  )
  select
    v_rate_file_id, region, country, destination_unlo, destination_cfs, transshipment,
    origin_cfs, upper(currency), rate_wm, minimum_rate, frequency, transit_time, collect, imo, remark
  from jsonb_to_recordset(p_rates) as rate_rows (
    region text, country text, destination_unlo text, destination_cfs text,
    transshipment text, origin_cfs text, currency text, rate_wm numeric,
    minimum_rate numeric, frequency text, transit_time text, collect text, imo text, remark text
  )
  where country is not null and destination_cfs is not null and origin_cfs is not null and rate_wm is not null and rate_wm > 0;

  insert into public.nvo_lcl_export_charges (
    rate_file_id, charge_key, label, country, currency, amount, basis
  )
  select
    v_rate_file_id, charge_key, label, country, upper(currency), amount, basis
  from jsonb_to_recordset(p_charges) as charge_rows (
    charge_key text, label text, country text, currency text, amount numeric, basis text
  )
  where charge_key is not null and label is not null and amount is not null;

  return v_rate_file_id;
end;
$$;

drop function if exists public.update_nvo_lcl_export_exchange_rate(text, uuid, numeric);
create or replace function public.update_nvo_lcl_export_exchange_rate(
  p_rate_file_id uuid,
  p_exchange_rate numeric
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.current_tff_user_id();

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Rate of exchange moet groter zijn dan 0';
  end if;

  update public.rate_files
  set exchange_rate = p_exchange_rate
  where id = p_rate_file_id
    and provider = 'NVO'
    and rate_type = 'lcl_export'
    and incoterm = 'CFR';
end;
$$;

drop function if exists public.save_lcl_quote(text, uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb);
drop function if exists public.save_lcl_quote(uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb);
create or replace function public.save_lcl_quote(
  p_quote_id uuid,
  p_direction text,
  p_customer_name text,
  p_tff_reference text,
  p_customer_reference text,
  p_incoterms text,
  p_loading_place text,
  p_unloading_place text,
  p_validity text,
  p_purchase_price numeric,
  p_margin_percentage numeric,
  p_sales_price numeric,
  p_payload jsonb
)
returns table (id uuid, quote_number text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_quote_id uuid;
  v_quote_number text;
  v_user_id uuid;
  v_user_label text;
begin
  v_user_id := public.current_tff_user_id();
  v_user_label := public.current_tff_user_label();

  if nullif(trim(p_customer_name), '') is null then
    raise exception 'Klantnaam is verplicht';
  end if;

  if p_quote_id is not null then
    update public.saved_quotes
    set
      direction = p_direction,
      customer_name = trim(p_customer_name),
      tff_reference = nullif(trim(coalesce(p_tff_reference, '')), ''),
      customer_reference = nullif(trim(coalesce(p_customer_reference, '')), ''),
      incoterms = p_incoterms,
      loading_place = nullif(trim(coalesce(p_loading_place, '')), ''),
      unloading_place = nullif(trim(coalesce(p_unloading_place, '')), ''),
      validity = p_validity,
      purchase_price = coalesce(p_purchase_price, 0),
      margin_percentage = coalesce(p_margin_percentage, 0),
      sales_price = coalesce(p_sales_price, 0),
      payload = coalesce(p_payload, '{}'::jsonb),
      updated_at = now()
    where public.saved_quotes.id = p_quote_id
      and public.saved_quotes.mode = 'lcl'
    returning public.saved_quotes.id, public.saved_quotes.quote_number into v_quote_id, v_quote_number;

    if v_quote_id is null then
      raise exception 'Offerte niet gevonden';
    end if;

    return query select v_quote_id, v_quote_number;
    return;
  end if;

  insert into public.saved_quotes (
    mode, direction, customer_name, tff_reference, customer_reference, incoterms,
    loading_place, unloading_place, validity, purchase_price, margin_percentage,
    sales_price, payload, created_by, created_by_label
  )
  values (
    'lcl', p_direction, trim(p_customer_name), nullif(trim(coalesce(p_tff_reference, '')), ''),
    nullif(trim(coalesce(p_customer_reference, '')), ''), p_incoterms,
    nullif(trim(coalesce(p_loading_place, '')), ''), nullif(trim(coalesce(p_unloading_place, '')), ''),
    p_validity, coalesce(p_purchase_price, 0), coalesce(p_margin_percentage, 0),
    coalesce(p_sales_price, 0), coalesce(p_payload, '{}'::jsonb), v_user_id, v_user_label
  )
  returning public.saved_quotes.id, public.saved_quotes.quote_number into v_quote_id, v_quote_number;

  return query select v_quote_id, v_quote_number;
end;
$$;

drop function if exists public.list_saved_quotes(text);
drop function if exists public.list_saved_quotes();
create or replace function public.list_saved_quotes()
returns table (
  id uuid, quote_number text, mode text, direction text, customer_name text,
  tff_reference text, customer_reference text, incoterms text, loading_place text,
  unloading_place text, validity text, purchase_price numeric, margin_percentage numeric,
  sales_price numeric, payload jsonb, created_by uuid, created_by_label text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.current_tff_user_id();

  return query
  select
    saved_quotes.id, saved_quotes.quote_number, saved_quotes.mode, saved_quotes.direction,
    saved_quotes.customer_name, saved_quotes.tff_reference, saved_quotes.customer_reference,
    saved_quotes.incoterms, saved_quotes.loading_place, saved_quotes.unloading_place,
    saved_quotes.validity, saved_quotes.purchase_price, saved_quotes.margin_percentage,
    saved_quotes.sales_price, saved_quotes.payload, saved_quotes.created_by,
    coalesce(saved_quotes.created_by_label, profiles.full_name, 'Onbekend') as created_by_label,
    saved_quotes.created_at
  from public.saved_quotes
  left join public.profiles on profiles.id = saved_quotes.created_by
  order by saved_quotes.created_at desc
  limit 250;
end;
$$;

drop function if exists public.get_saved_quote(text, uuid);
drop function if exists public.get_saved_quote(uuid);
create or replace function public.get_saved_quote(p_quote_id uuid)
returns table (
  id uuid, quote_number text, mode text, direction text, customer_name text,
  tff_reference text, customer_reference text, incoterms text, loading_place text,
  unloading_place text, validity text, purchase_price numeric, margin_percentage numeric,
  sales_price numeric, payload jsonb, created_by uuid, created_by_label text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.current_tff_user_id();

  return query
  select
    saved_quotes.id, saved_quotes.quote_number, saved_quotes.mode, saved_quotes.direction,
    saved_quotes.customer_name, saved_quotes.tff_reference, saved_quotes.customer_reference,
    saved_quotes.incoterms, saved_quotes.loading_place, saved_quotes.unloading_place,
    saved_quotes.validity, saved_quotes.purchase_price, saved_quotes.margin_percentage,
    saved_quotes.sales_price, saved_quotes.payload, saved_quotes.created_by,
    coalesce(saved_quotes.created_by_label, profiles.full_name, 'Onbekend') as created_by_label,
    saved_quotes.created_at
  from public.saved_quotes
  left join public.profiles on profiles.id = saved_quotes.created_by
  where saved_quotes.id = p_quote_id
    and saved_quotes.mode = 'lcl'
  limit 1;
end;
$$;

drop function if exists public.delete_saved_quote(text, uuid);
drop function if exists public.delete_saved_quote(uuid);
create or replace function public.delete_saved_quote(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.current_tff_user_id();

  delete from public.saved_quotes
  where id = p_quote_id;
end;
$$;

revoke all on function public.replace_nvo_lcl_import_rates(text, text, numeric, jsonb, jsonb) from public, anon;
revoke all on function public.update_nvo_lcl_import_exchange_rate(uuid, numeric) from public, anon;
revoke all on function public.replace_nvo_lcl_export_rates(text, text, numeric, jsonb, jsonb) from public, anon;
revoke all on function public.update_nvo_lcl_export_exchange_rate(uuid, numeric) from public, anon;
revoke all on function public.save_lcl_quote(uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb) from public, anon;
revoke all on function public.list_saved_quotes() from public, anon;
revoke all on function public.get_saved_quote(uuid) from public, anon;
revoke all on function public.delete_saved_quote(uuid) from public, anon;

grant execute on function public.replace_nvo_lcl_import_rates(text, text, numeric, jsonb, jsonb) to authenticated;
grant execute on function public.update_nvo_lcl_import_exchange_rate(uuid, numeric) to authenticated;
grant execute on function public.replace_nvo_lcl_export_rates(text, text, numeric, jsonb, jsonb) to authenticated;
grant execute on function public.update_nvo_lcl_export_exchange_rate(uuid, numeric) to authenticated;
grant execute on function public.save_lcl_quote(uuid, text, text, text, text, text, text, text, text, numeric, numeric, numeric, jsonb) to authenticated;
grant execute on function public.list_saved_quotes() to authenticated;
grant execute on function public.get_saved_quote(uuid) to authenticated;
grant execute on function public.delete_saved_quote(uuid) to authenticated;
