-- ============================================
-- CREAR PERFIL PARA test@test.com
-- ============================================
-- Este script crea el perfil que falta para el usuario test@test.com

-- Paso 1: Obtener el ID del usuario
-- Ejecuta esto primero para obtener el USER_ID:
SELECT id, email FROM auth.users WHERE email = 'test@test.com';

-- Paso 2: Copiar el ID de arriba y reemplazar en el INSERT de abajo
-- Reemplaza 'PEGAR_USER_ID_AQUI' con el UUID que obtuviste

-- Paso 3: Ejecutar este INSERT (después de reemplazar el ID)
INSERT INTO profiles (
  id,
  username,
  level,
  current_xp,
  max_xp_for_next_level,
  hp,
  max_hp,
  credits,
  is_onboarded,
  created_at,
  updated_at
)
VALUES (
  'PEGAR_USER_ID_AQUI',  -- ⚠️ REEMPLAZAR CON EL ID DEL PASO 1
  'test',
  1,
  0,
  100,
  100,
  100,
  0,
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  level = EXCLUDED.level,
  current_xp = EXCLUDED.current_xp,
  max_xp_for_next_level = EXCLUDED.max_xp_for_next_level,
  hp = EXCLUDED.hp,
  max_hp = EXCLUDED.max_hp,
  is_onboarded = EXCLUDED.is_onboarded;

-- Paso 4: Crear game_rules si no existe
INSERT INTO game_rules (user_id)
VALUES ('PEGAR_USER_ID_AQUI')  -- ⚠️ REEMPLAZAR CON EL MISMO ID
ON CONFLICT (user_id) DO NOTHING;

-- Paso 5: Verificar que se creó correctamente
SELECT 
  p.id,
  p.username,
  p.level,
  p.current_xp,
  p.max_xp_for_next_level,
  p.hp,
  p.max_hp,
  p.is_onboarded,
  au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'test@test.com';

-- Deberías ver 1 fila con todos los datos del perfil
