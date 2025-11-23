-- 1. ACTIVAR EXTENSIÓN (Necesaria para los IDs)
create extension if not exists "uuid-ossp";

-- 2. TABLA PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('person', 'business')),
  current_mode text not null check (current_mode in ('networking', 'social', 'discovery')),
  categories text[] default '{}',
  bio text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- 3. TABLA USER_LOCATIONS
create table user_locations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  is_visible boolean default true,
  accuracy double precision,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_locations enable row level security;

create policy "Users can view visible locations"
  on user_locations for select
  using ( is_visible = true );

create policy "Users can insert own location"
  on user_locations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own location"
  on user_locations for update
  using ( auth.uid() = user_id );

create index user_locations_lat_lng_idx on user_locations (latitude, longitude);
create index user_locations_user_id_idx on user_locations (user_id);

-- 4. TABLA USER_STATUSES
create table user_statuses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  emoji text not null,
  text text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table user_statuses enable row level security;

create policy "Users can view non-expired statuses"
  on user_statuses for select
  using ( expires_at > now() );

create policy "Users can create own status"
  on user_statuses for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own status"
  on user_statuses for update
  using ( auth.uid() = user_id );

create policy "Users can delete own status"
  on user_statuses for delete
  using ( auth.uid() = user_id );

create index user_statuses_expires_at_idx on user_statuses (expires_at);
create index user_statuses_user_id_idx on user_statuses (user_id);

-- 5. TABLA CONVERSATIONS
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table conversations enable row level security;

-- 6. TABLA CONVERSATION_PARTICIPANTS
create table conversation_participants (
  conversation_id uuid references conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (conversation_id, user_id)
);

alter table conversation_participants enable row level security;

create policy "Users can view own conversations"
  on conversation_participants for select
  using ( auth.uid() = user_id );

-- 7. TABLA MESSAGES
create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table messages enable row level security;

create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = messages.conversation_id
      and conversation_participants.user_id = auth.uid()
    )
  );

create policy "Users can send messages to their conversations"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversation_participants
      where conversation_participants.conversation_id = messages.conversation_id
      and conversation_participants.user_id = auth.uid()
    )
  );

create index messages_conversation_id_idx on messages (conversation_id);
create index messages_created_at_idx on messages (created_at desc);

-- 8. ACTIVAR REALTIME AUTOMÁTICAMENTE
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table user_locations;
alter publication supabase_realtime add table user_statuses;
alter publication supabase_realtime add table messages;
