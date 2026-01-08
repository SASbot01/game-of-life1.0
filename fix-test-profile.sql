-- Script para verificar y arreglar el perfil del usuario test@test.com

-- 1. Verificar si el usuario existe en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'test@test.com';

-- 2. Verificar si el perfil existe
SELECT p.*, au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'test@test.com';

-- 3. Si el perfil NO existe, crearlo manualmente
-- (Reemplaza 'USER_ID_AQUI' con el ID del paso 1)
/*
INSERT INTO profiles (id, username, level, current_xp, max_xp_for_next_level, hp, max_hp, credits, is_onboarded)
VALUES (
  'USER_ID_AQUI',
  'test',
  1,
  0,
  100,
  100,
  100,
  0,
  true
)
ON CONFLICT (id) DO NOTHING;
*/

-- 4. Si el perfil existe pero tiene datos incorrectos, actualizarlo
/*
UPDATE profiles
SET 
  current_xp = 0,
  level = 1,
  max_xp_for_next_level = 100,
  hp = 100,
  max_hp = 100
WHERE id = (SELECT id FROM auth.users WHERE email = 'test@test.com');
*/

-- 5. Verificar el trigger que crea perfiles automáticamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Si el trigger no existe, recrearlo
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  INSERT INTO public.game_rules (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/
