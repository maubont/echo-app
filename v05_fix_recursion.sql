-- =================================================================================
-- FIX v0.5.0: Resolver Recursión Infinita en Políticas RLS
-- Ejecutar en SQL Editor de Supabase
-- =================================================================================

-- 1. Crear una función SECURITY DEFINER para leer el modo de un usuario sin disparar RLS
CREATE OR REPLACE FUNCTION public.get_user_mode(target_user_id UUID)
RETURNS TEXT AS $$
  SELECT current_mode FROM profiles WHERE id = target_user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Corregir política de profiles
DROP POLICY IF EXISTS "Users can view profiles in same mode" ON profiles;

CREATE POLICY "Users can view profiles in same mode"
  ON profiles FOR SELECT
  USING (
    current_mode = public.get_user_mode(auth.uid())
  );

-- 3. Corregir política de user_mode_profiles
DROP POLICY IF EXISTS "Users can view mode profiles of active users in the same mode" ON user_mode_profiles;

CREATE POLICY "Users can view mode profiles of active users in the same mode"
  ON user_mode_profiles FOR SELECT
  USING (
    public.get_user_mode(auth.uid()) = mode
    AND
    public.get_user_mode(user_mode_profiles.user_id) = mode
  );

-- 4. Corregir política de user_locations (que causaba el error al dar click en 'Hacerme Visible')
DROP POLICY IF EXISTS "Users can view locations with mode isolation and blocks" ON user_locations;
DROP POLICY IF EXISTS "Users can view locations based on strict mode isolation" ON user_locations;

CREATE POLICY "Users can view locations with mode isolation and blocks"
  ON user_locations FOR SELECT
  USING (
    is_visible = true AND
    (
      auth.uid() = user_id OR
      (
        -- Mismo modo (usando la función para evitar recursión)
        public.get_user_mode(auth.uid()) = public.get_user_mode(user_locations.user_id)
        AND
        -- No en Ghost Mode
        NOT COALESCE(
          (SELECT is_ghost_mode FROM user_mode_profiles 
           WHERE user_id = user_locations.user_id 
           AND mode = public.get_user_mode(user_locations.user_id)), 
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
