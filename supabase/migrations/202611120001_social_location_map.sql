create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  constraint friendship_pair_unique unique (requester_id, addressee_id)
);

create index if not exists friendships_requester_status_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_status_idx on public.friendships (addressee_id, status);

create table if not exists public.locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m >= 0),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists locations_expiry_idx on public.locations (expires_at);

create table if not exists public.bumps (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint bump_not_self check (sender_id <> recipient_id)
);

create index if not exists bumps_recipient_created_idx on public.bumps (recipient_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint message_not_self check (sender_id <> recipient_id)
);

create index if not exists messages_conversation_created_idx on public.messages (sender_id, recipient_id, created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_username text;
  candidate text;
  candidate_suffix integer := 0;
  safe_display_name text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_username) < 3 then
    base_username := 'student_' || substr(new.id::text, 1, 8);
  end if;
  base_username := left(base_username, 24);
  candidate := base_username;
  while exists (select 1 from public.profiles p where p.username = candidate) loop
    candidate_suffix := candidate_suffix + 1;
    candidate := left(base_username, 24 - char_length(candidate_suffix::text)) || candidate_suffix::text;
  end loop;
  safe_display_name := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', candidate)), 50);
  if safe_display_name = '' then safe_display_name := candidate; end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, safe_display_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.lookup_profile_by_friend_code(code_input text)
returns table (id uuid, username text, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.username, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and p.friend_code = upper(trim(code_input))
    and p.id <> auth.uid()
  limit 1;
$$;

create or replace function public.get_my_network_profiles()
returns table (id uuid, username text, display_name text, friend_code text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.username, p.display_name,
    case when p.id = auth.uid() then p.friend_code else null end
  from public.profiles p
  where p.id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where f.status in ('pending', 'accepted')
        and ((f.requester_id = auth.uid() and f.addressee_id = p.id)
          or (f.addressee_id = auth.uid() and f.requester_id = p.id))
    );
$$;

create or replace function public.respond_to_friend_request(request_id uuid, accept_request boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.friendships
  set status = case when accept_request then 'accepted' else 'declined' end
  where id = request_id and addressee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Friend request not found or already handled'; end if;
end;
$$;

grant execute on function public.lookup_profile_by_friend_code(text) to authenticated;
grant execute on function public.get_my_network_profiles() to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
revoke all on function public.lookup_profile_by_friend_code(text) from public, anon;
revoke all on function public.get_my_network_profiles() from public, anon;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.locations enable row level security;
alter table public.bumps enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles: read own row" on public.profiles;
create policy "Profiles: read own row" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "Profiles: update own row" on public.profiles;
create policy "Profiles: update own row" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Friendships: read own requests" on public.friendships;
create policy "Friendships: read own requests" on public.friendships
  for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "Friendships: send request as self" on public.friendships;
create policy "Friendships: send request as self" on public.friendships
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending' and requester_id <> addressee_id);
drop policy if exists "Friendships: remove own connection" on public.friendships;
create policy "Friendships: remove own connection" on public.friendships
  for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Locations: read self or active accepted friends" on public.locations;
create policy "Locations: read self or active accepted friends" on public.locations
  for select to authenticated using (
    user_id = auth.uid()
    or (
      (expires_at is null or expires_at > now())
      and exists (
        select 1 from public.friendships f
        where f.status = 'accepted'
          and ((f.requester_id = auth.uid() and f.addressee_id = locations.user_id)
            or (f.addressee_id = auth.uid() and f.requester_id = locations.user_id))
      )
    )
  );
drop policy if exists "Locations: insert own location" on public.locations;
create policy "Locations: insert own location" on public.locations
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Locations: update own location" on public.locations;
create policy "Locations: update own location" on public.locations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Locations: delete own location" on public.locations;
create policy "Locations: delete own location" on public.locations
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Bumps: read sent or received" on public.bumps;
create policy "Bumps: read sent or received" on public.bumps
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "Bumps: send to accepted friend" on public.bumps;
create policy "Bumps: send to accepted friend" on public.bumps
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = bumps.recipient_id)
          or (f.addressee_id = auth.uid() and f.requester_id = bumps.recipient_id))
    )
  );

drop policy if exists "Messages: read accepted friend conversations" on public.messages;
create policy "Messages: read accepted friend conversations" on public.messages
  for select to authenticated using (
    (sender_id = auth.uid() or recipient_id = auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = messages.sender_id and f.addressee_id = messages.recipient_id)
          or (f.addressee_id = messages.sender_id and f.requester_id = messages.recipient_id))
    )
  );
drop policy if exists "Messages: send to accepted friend" on public.messages;
create policy "Messages: send to accepted friend" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and char_length(trim(body)) between 1 and 2000
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = messages.recipient_id)
          or (f.addressee_id = auth.uid() and f.requester_id = messages.recipient_id))
    )
  );
drop policy if exists "Messages: add to realtime" on public.messages;

do $$
begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.bumps;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$$;

