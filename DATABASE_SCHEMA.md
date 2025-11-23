# Supabase Database Schema

Este documento contiene el schema completo de la base de datos para Proxi App.

## Script Completo (Ejecutar en SQL Editor de Supabase)

```sql
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
```

## Instrucciones de Ejecución

1. Ve al Dashboard de tu proyecto Supabase
2. Navega a **SQL Editor**
3. Copia y pega **todo el script SQL** anterior
4. Haz clic en **Run** para ejecutarlo

El script completo creará:
- ✅ Todas las tablas necesarias
- ✅ Políticas de seguridad (RLS)
- ✅ Índices para optimización
- ✅ Realtime habilitado automáticamente

## Estructura de Tablas

### profiles
Información de perfil de usuarios (extiende auth.users de Supabase)

### user_locations
Ubicaciones en tiempo real de los usuarios

### user_statuses
Estados efímeros "Proxi Pulse"

### conversations
Metadata de conversaciones de chat

### conversation_participants
Relación usuario-conversación

### messages
Mensajes de chat persistentes


## Tables to Create

### 1. profiles
User profile information (extends Supabase Auth users)

```sql
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

-- Enable RLS
alter table profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );
```

### 2. user_locations
Real-time location tracking

```sql
create table user_locations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  is_visible boolean default true,
  accuracy double precision,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_locations enable row level security;

-- Policies
create policy "Users can view visible locations"
  on user_locations for select
  using ( is_visible = true );

create policy "Users can update own location"
  on user_locations for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own location"
  on user_locations for update
  using ( auth.uid() = user_id );

-- Create index for geospatial queries
create index user_locations_lat_lng_idx on user_locations (latitude, longitude);
create index user_locations_user_id_idx on user_locations (user_id);
```

### 3. user_statuses
Proxi Pulse ephemeral statuses

```sql
create table user_statuses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  emoji text not null,
  text text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_statuses enable row level security;

-- Policies
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

-- Create index for expiry queries
create index user_statuses_expires_at_idx on user_statuses (expires_at);
create index user_statuses_user_id_idx on user_statuses (user_id);
```

### 4. conversations
Chat conversation metadata

```sql
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table conversations enable row level security;
```

### 5. conversation_participants
Link users to conversations

```sql
create table conversation_participants (
  conversation_id uuid references conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (conversation_id, user_id)
);

-- Enable RLS
alter table conversation_participants enable row level security;

-- Policies
create policy "Users can view own conversations"
  on conversation_participants for select
  using ( auth.uid() = user_id );
```

### 6. messages
Chat messages

```sql
create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table messages enable row level security;

-- Policies
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

-- Create index for message queries
create index messages_conversation_id_idx on messages (conversation_id);
create index messages_created_at_idx on messages (created_at desc);
```

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each table creation script above
4. Run each script in order
5. Enable Realtime for the following tables:
   - `user_locations`
   - `user_statuses`
   - `messages`

To enable Realtime:
1. Go to Database → Replication
2. Toggle on the tables mentioned above
