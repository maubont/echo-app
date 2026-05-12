-- =================================================================================
-- PASO 1: MIGRACIÓN DE MODOS MÚLTIPLES Y MODO ADULTO (PRIVACIDAD FUERTE)
-- Copia y pega esto en el SQL Editor de Supabase y dale Run.
-- =================================================================================

-- 1. Actualizar el constraint de 'current_mode' en la tabla 'profiles'
-- Primero eliminamos el constraint existente (Supabase suele nombrarlo con el nombre de la columna o tabla)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_current_mode_check;
-- Agregamos el nuevo permitiendo 'adult' y 'casual'
ALTER TABLE profiles ADD CONSTRAINT profiles_current_mode_check 
  CHECK (current_mode IN ('networking', 'social', 'discovery', 'adult'));

-- 2. Crear la tabla de perfiles independientes por modo
CREATE TABLE IF NOT EXISTS user_mode_profiles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('networking', 'social', 'discovery', 'adult')),
    nickname TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_ghost_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, mode)
);

ALTER TABLE user_mode_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Un usuario puede ver y editar sus propios perfiles de modo
CREATE POLICY "Users can manage their own mode profiles"
  ON user_mode_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política de Privacidad Estricta: 
-- Solo puedes ver los perfiles de otros si estás en el MISMO modo que ellos.
CREATE POLICY "Users can view mode profiles of active users in the same mode"
  ON user_mode_profiles FOR SELECT
  USING (
    (SELECT current_mode FROM profiles WHERE id = auth.uid()) = mode
    AND
    (SELECT current_mode FROM profiles WHERE id = user_mode_profiles.user_id) = mode
  );

-- 3. Aislamiento estricto en user_locations
-- Eliminamos la política actual que permitía ver a cualquiera que fuera visible
DROP POLICY IF EXISTS "Users can view visible locations" ON user_locations;

-- Creamos la nueva política: Solo ves las ubicaciones de las personas que 
-- 1. Son visibles (is_visible = true)
-- 2. No están en ghost mode en su perfil de modo actual
-- 3. Están exactamente en el mismo modo que tú.
CREATE POLICY "Users can view locations based on strict mode isolation"
  ON user_locations FOR SELECT
  USING (
    is_visible = true AND
    (
      auth.uid() = user_id OR
      (
        (SELECT current_mode FROM profiles WHERE id = auth.uid()) = (SELECT current_mode FROM profiles WHERE id = user_locations.user_id)
        AND
        -- Verificamos que no esté en modo fantasma en su modo actual
        NOT COALESCE(
          (SELECT is_ghost_mode FROM user_mode_profiles 
           WHERE user_id = user_locations.user_id 
           AND mode = (SELECT current_mode FROM profiles WHERE id = user_locations.user_id)), 
          false
        )
      )
    )
  );

-- 4. Soporte para chats efímeros y contexto de modo en conversaciones
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'networking';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 5. Seguridad en mensajes (Autodestrucción / Bloqueo de lectura)
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations if not expired"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
    AND
    -- Verifica que la conversación no haya expirado (para modo adulto)
    (
      (SELECT expires_at FROM conversations WHERE id = messages.conversation_id) IS NULL
      OR
      (SELECT expires_at FROM conversations WHERE id = messages.conversation_id) > NOW()
    )
  );
