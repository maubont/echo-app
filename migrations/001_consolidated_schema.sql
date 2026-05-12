-- =================================================================================
-- ECHO APP — Consolidated Database Schema
-- Version: 0.3.0 (2026-05-11)
-- 
-- Este archivo representa el esquema COMPLETO y FINAL de la base de datos.
-- Si configuras el proyecto desde cero, ejecuta SOLO este archivo.
-- =================================================================================

-- ========================================
-- EXTENSIONES
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. TABLA: profiles
-- ========================================
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Siempre puedes ver tu propio perfil
CREATE POLICY "Users can always view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Solo ves perfiles de usuarios en el MISMO modo (protege modo adulto)
CREATE POLICY "Users can view profiles in same mode"
  ON profiles FOR SELECT
  USING (
    current_mode = (SELECT current_mode FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ========================================
-- 2. TABLA: user_mode_profiles
-- Perfiles independientes por modo
-- ========================================
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

ALTER TABLE user_mode_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mode profiles"
  ON user_mode_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view mode profiles of active users in the same mode"
  ON user_mode_profiles FOR SELECT
  USING (
    (SELECT current_mode FROM profiles WHERE id = auth.uid()) = mode
    AND
    (SELECT current_mode FROM profiles WHERE id = user_mode_profiles.user_id) = mode
  );

-- ========================================
-- 3. TABLA: user_locations
-- Ubicaciones en tiempo real con aislamiento por modo
-- ========================================
CREATE TABLE user_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT user_locations_user_id_key UNIQUE (user_id)
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations based on strict mode isolation"
  ON user_locations FOR SELECT
  USING (
    is_visible = true AND
    (
      auth.uid() = user_id OR
      (
        -- Mismo modo
        (SELECT current_mode FROM profiles WHERE id = auth.uid()) = 
        (SELECT current_mode FROM profiles WHERE id = user_locations.user_id)
        AND
        -- No en Ghost Mode
        NOT COALESCE(
          (SELECT is_ghost_mode FROM user_mode_profiles 
           WHERE user_id = user_locations.user_id 
           AND mode = (SELECT current_mode FROM profiles WHERE id = user_locations.user_id)), 
          false
        )
      )
    )
  );

CREATE POLICY "Users can insert own location"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX user_locations_lat_lng_idx ON user_locations (latitude, longitude);
CREATE INDEX user_locations_user_id_idx ON user_locations (user_id);

-- ========================================
-- 4. TABLA: user_statuses
-- Estados efímeros
-- ========================================
CREATE TABLE user_statuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  text TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE user_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view non-expired statuses"
  ON user_statuses FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can create own status"
  ON user_statuses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own status"
  ON user_statuses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own status"
  ON user_statuses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX user_statuses_expires_at_idx ON user_statuses (expires_at);
CREATE INDEX user_statuses_user_id_idx ON user_statuses (user_id);

-- ========================================
-- 5. TABLA: conversations
-- Con soporte para modo y expiración
-- ========================================
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mode TEXT DEFAULT 'networking',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. TABLA: conversation_participants
-- ========================================
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. TABLA: messages
-- Con bloqueo de lectura para conversaciones expiradas
-- ========================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX messages_conversation_id_idx ON messages (conversation_id);
CREATE INDEX messages_created_at_idx ON messages (created_at DESC);

-- ========================================
-- 8. FUNCIÓN HELPER: is_chat_participant
-- Evita recursión en políticas RLS de chat
-- ========================================
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. POLÍTICAS RLS DE CHAT
-- ========================================

-- Conversations
CREATE POLICY "Users can create conversations" 
  ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversations they are part of" 
  ON conversations FOR SELECT USING (public.is_chat_participant(id));

-- Participants
CREATE POLICY "Users can add participants" 
  ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view participants" 
  ON conversation_participants FOR SELECT USING (public.is_chat_participant(conversation_id));

-- Messages (con bloqueo de expiración)
CREATE POLICY "Users can view messages in their conversations if not expired"
  ON messages FOR SELECT
  USING (
    public.is_chat_participant(conversation_id)
    AND (
      (SELECT expires_at FROM conversations WHERE id = messages.conversation_id) IS NULL
      OR
      (SELECT expires_at FROM conversations WHERE id = messages.conversation_id) > NOW()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_chat_participant(conversation_id)
  );

-- ========================================
-- 10. RPC: create_new_conversation
-- Creación atómica con soporte de modo y expiración
-- ========================================
CREATE OR REPLACE FUNCTION public.create_new_conversation(
  participant_ids UUID[],
  conv_mode TEXT DEFAULT 'networking',
  conv_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_conv_id UUID;
BEGIN
  -- Seguridad: el caller debe ser participante
  IF NOT (auth.uid() = ANY(participant_ids)) THEN
    RAISE EXCEPTION 'You must be a participant in the conversation you are creating';
  END IF;

  INSERT INTO conversations (mode, expires_at)
  VALUES (conv_mode, conv_expires_at)
  RETURNING id INTO new_conv_id;
  
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, unnest(participant_ids);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 11. FUNCIÓN: cleanup_expired_conversations
-- Para limpieza periódica (pg_cron o manual)
-- ========================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_conversations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversations
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 12. REALTIME
-- ========================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE user_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
