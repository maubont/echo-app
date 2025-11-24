-- FIX AUTHENTICATION ISSUES

-- 1. Confirm all users (Bypass Email Confirmation)
-- This updates the auth.users table to mark all users as confirmed.
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. Ensure all users have a profile in public.profiles
-- This inserts missing profiles for existing auth users.
INSERT INTO public.profiles (id, name, email, role, current_mode, bio, avatar_url)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 
    email, 
    COALESCE((raw_user_meta_data->>'role')::text, 'person'), 
    'networking', 
    '¡Hola! Soy nuevo aquí.', 
    COALESCE(raw_user_meta_data->>'avatar_url', 'https://ui-avatars.com/api/?name=' || split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 3. Grant necessary permissions (just in case)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
