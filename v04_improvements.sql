-- =================================================================================
-- MEJORAS v0.4.0: Verificación de edad, Reportes, Bloqueos
-- Ejecutar en SQL Editor de Supabase
-- =================================================================================

-- 1. Campo de verificación de edad en user_mode_profiles
ALTER TABLE user_mode_profiles ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE;

-- 2. Tabla de reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'fake', 'underage', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 3. Tabla de bloqueos
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their blocks"
  ON blocked_users FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- 4. Actualizar política de user_locations para excluir usuarios bloqueados
DROP POLICY IF EXISTS "Users can view locations based on strict mode isolation" ON user_locations;

CREATE POLICY "Users can view locations with mode isolation and blocks"
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
        AND
        -- No bloqueado (en ninguna dirección)
        NOT EXISTS (
          SELECT 1 FROM blocked_users 
          WHERE (blocker_id = auth.uid() AND blocked_id = user_locations.user_id)
             OR (blocker_id = user_locations.user_id AND blocked_id = auth.uid())
        )
      )
    )
  );

-- 5. Índices
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON reports (reported_user_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users (blocked_id);
