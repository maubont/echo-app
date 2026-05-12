-- =================================================================================
-- FIX: Restringir visibilidad de perfiles para proteger modo adulto
-- Ejecutar en SQL Editor de Supabase
-- =================================================================================

-- 1. Eliminar la política permisiva antigua que permite ver TODOS los perfiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- 2. Política: Siempre puedes ver tu propio perfil
CREATE POLICY "Users can always view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. Política: Solo puedes ver perfiles de otros usuarios si están en el MISMO modo que tú
-- Esto protege a los usuarios en modo 'adult' de ser vistos por usuarios en otros modos
CREATE POLICY "Users can view profiles in same mode"
  ON profiles FOR SELECT
  USING (
    -- Usuarios en el mismo modo que el solicitante
    current_mode = (SELECT current_mode FROM profiles WHERE id = auth.uid())
  );

-- 4. Mantener la política de edición (ya debería existir, la recreamos por seguridad)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. Política de INSERT para registro (el trigger de auth necesita insertar)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
