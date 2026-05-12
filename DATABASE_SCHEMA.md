# Echo — Database Schema (Supabase)

> **Última actualización**: 2026-05-11 (v0.3.0)
> Este documento refleja el esquema **real** en producción, incluyendo modo adulto, perfiles por modo y chat efímero.

---

## Tablas

### 1. `profiles`
Perfil global del usuario. Extiende `auth.users` de Supabase.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('person', 'business')),
  current_mode TEXT NOT NULL CHECK (current_mode IN ('networking', 'social', 'discovery', 'adult')),
  categories TEXT[] DEFAULT '{}',
  bio TEXT,
  avatar_url TEXT,
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**RLS Policies:**
- `Users can view profiles in same mode` — Solo ve perfiles de usuarios en el mismo modo (protege modo adulto).
- `Users can always view own profile` — Siempre puedes ver tu propio perfil.
- `Users can update own profile` — Solo puedes editar tu perfil.

---

### 2. `user_mode_profiles`
Perfil independiente por modo. Cada usuario tiene datos separados (nickname, bio, avatar, ghost) por cada modo activo.

```sql
CREATE TABLE user_mode_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('networking', 'social', 'discovery', 'adult')),
  nickname TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_ghost_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, mode)
);
```

**RLS Policies:**
- `Users can manage their own mode profiles` — CRUD completo sobre tus propios perfiles.
- `Users can view mode profiles of active users in the same mode` — Solo ves perfiles de modo de usuarios que están en el **mismo modo** que tú.

---

### 3. `user_locations`
Ubicaciones en tiempo real. Incluye aislamiento estricto por modo.

```sql
CREATE TABLE user_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Índices:** `(latitude, longitude)`, `(user_id)`

**RLS Policies:**
- `Users can view locations based on strict mode isolation`:
  - `is_visible = true`
  - El usuario remoto está en el **mismo modo** que tú
  - El usuario remoto **no está en Ghost Mode** en su perfil de modo actual
- `Users can insert/update own location`

> **Nota**: En modo `adult`, la aplicación aplica **coordinate jittering** (~1km) antes de enviar la ubicación a Supabase.

---

### 4. `user_statuses`
Estados efímeros "Echo Pulse" (emoji + texto con expiración).

```sql
CREATE TABLE user_statuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  text TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Índices:** `(expires_at)`, `(user_id)`

**RLS Policies:**
- `Users can view non-expired statuses`
- `Users can create/update/delete own status`

---

### 5. `conversations`
Conversaciones de chat. Soporta modo y expiración para chat efímero.

```sql
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mode TEXT DEFAULT 'networking',
  expires_at TIMESTAMPTZ,  -- NULL = permanente, set = efímero (24h para modo adult)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

---

### 6. `conversation_participants`
Relación usuario ↔ conversación.

```sql
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);
```

**RLS Policies:**
- `Users can view own conversations`

---

### 7. `messages`
Mensajes de chat. Bloquea lectura de conversaciones expiradas.

```sql
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Índices:** `(conversation_id)`, `(created_at DESC)`

**RLS Policies:**
- `Users can view messages in their conversations if not expired`:
  - Debe ser participante de la conversación
  - La conversación no debe haber expirado (`expires_at IS NULL OR expires_at > NOW()`)
- `Users can send messages to their conversations`

---

## Funciones RPC

### `create_new_conversation(participant_ids, conv_mode, conv_expires_at)`
Crea una conversación de forma atómica (evita race conditions con RLS).

```sql
CREATE FUNCTION create_new_conversation(
  participant_ids UUID[],
  conv_mode TEXT DEFAULT 'networking',
  conv_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
```
- Para modo `adult`: la app pasa `conv_expires_at = NOW() + 24h`
- `SECURITY DEFINER` — se ejecuta con permisos elevados

### `cleanup_expired_conversations()`
Elimina conversaciones expiradas y sus mensajes (CASCADE).

```sql
CREATE FUNCTION cleanup_expired_conversations() RETURNS INTEGER
```
- Puede ejecutarse periódicamente vía `pg_cron` o manualmente.

---

## Realtime

Las siguientes tablas tienen Realtime habilitado:
- `user_locations` — Actualizaciones de ubicación en tiempo real
- `user_statuses` — Estados efímeros
- `messages` — Mensajes de chat

---

## Diagrama de Relaciones

```
auth.users
├── profiles (1:1)
├── user_mode_profiles (1:N, una por modo)
├── user_locations (1:1, ubicación actual)
├── user_statuses (1:N, estados efímeros)
└── conversation_participants (N:M)
    └── conversations
        ├── mode (networking|social|discovery|adult)
        ├── expires_at (nullable, 24h para adult)
        └── messages (1:N)
```

---

## Orden de Ejecución de Migraciones

Si configuras el proyecto desde cero, ejecuta en este orden:

1. **`migrations/001_base_schema.sql`** — Tablas base, RLS, índices, Realtime
2. **`migrations/002_chat_security.sql`** — RPC `create_new_conversation`, políticas de mensajes
3. **`migrations/003_adult_mode.sql`** — `user_mode_profiles`, aislamiento por modo, chat efímero
