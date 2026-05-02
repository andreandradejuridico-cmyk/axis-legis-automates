create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit contact"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

create policy "Admins read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));