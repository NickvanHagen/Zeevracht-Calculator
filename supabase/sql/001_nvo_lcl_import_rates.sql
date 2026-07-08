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

drop policy if exists "rate_files_select_anon" on public.rate_files;
create policy "rate_files_select_anon"
  on public.rate_files for select
  to anon
  using (true);

drop policy if exists "rate_files_insert_anon" on public.rate_files;
create policy "rate_files_insert_anon"
  on public.rate_files for insert
  to anon
  with check (true);

drop policy if exists "rate_files_update_anon" on public.rate_files;
create policy "rate_files_update_anon"
  on public.rate_files for update
  to anon
  using (true)
  with check (true);

drop policy if exists "nvo_lcl_import_rates_select_anon" on public.nvo_lcl_import_rates;
create policy "nvo_lcl_import_rates_select_anon"
  on public.nvo_lcl_import_rates for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_import_rates_insert_anon" on public.nvo_lcl_import_rates;
create policy "nvo_lcl_import_rates_insert_anon"
  on public.nvo_lcl_import_rates for insert
  to anon
  with check (true);

drop policy if exists "nvo_lcl_import_local_charges_select_anon" on public.nvo_lcl_import_local_charges;
create policy "nvo_lcl_import_local_charges_select_anon"
  on public.nvo_lcl_import_local_charges for select
  to anon
  using (true);

drop policy if exists "nvo_lcl_import_local_charges_insert_anon" on public.nvo_lcl_import_local_charges;
create policy "nvo_lcl_import_local_charges_insert_anon"
  on public.nvo_lcl_import_local_charges for insert
  to anon
  with check (true);
