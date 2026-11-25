-- Optional Supabase configuration. Run once in SQL Editor.
-- Anonymous guests may insert only name/message; public reads are approved only.
create table if not exists public.wedding_guestbook (
 id bigint generated always as identity primary key,
 name text not null check (char_length(btrim(name)) between 1 and 30),
 message text not null check (char_length(btrim(message)) between 1 and 500),
 created_at timestamptz not null default now(),
 approved boolean not null default false
);
alter table public.wedding_guestbook enable row level security;
revoke all on public.wedding_guestbook from anon, authenticated;
grant insert (name,message) on public.wedding_guestbook to anon, authenticated;
grant select (name,message,created_at,approved) on public.wedding_guestbook to anon, authenticated;
create policy "guests can submit" on public.wedding_guestbook for insert to anon, authenticated with check (approved=false);
create policy "approved messages only" on public.wedding_guestbook for select to anon, authenticated using (approved=true);
-- Moderate by setting approved=true in Supabase dashboard. Delete spam in dashboard.
-- Before public launch, add server-side abuse prevention/rate limiting and a privacy notice.

-- Attendance responses are private: no anonymous or authenticated reads.
create table if not exists public.wedding_rsvp (
 id bigint generated always as identity primary key,
 guest_name text not null check (char_length(btrim(guest_name)) between 1 and 30),
 side text not null check (side in ('groom','bride')),
 attendance text not null check (attendance in ('yes','no')),
 meal text not null check (meal in ('yes','no','unknown','not_applicable')),
 companions integer not null default 0 check (companions between 0 and 20),
 consent boolean not null check (consent=true),
 created_at timestamptz not null default now(),
 check ((attendance='yes' and meal in ('yes','no','unknown')) or (attendance='no' and meal='not_applicable' and companions=0))
);
alter table public.wedding_rsvp enable row level security;
revoke all on public.wedding_rsvp from anon, authenticated;
grant insert (guest_name,side,attendance,meal,companions,consent) on public.wedding_rsvp to anon, authenticated;
create policy "guests submit rsvp" on public.wedding_rsvp for insert to anon, authenticated with check (consent=true);
-- Read responses using the authorized Supabase dashboard, not public website.
