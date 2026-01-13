-- Verificar datos del usuario test@test.com
SELECT 
  p.id,
  p.username,
  p.level,
  p.current_xp,
  p.max_xp_for_next_level,
  p.hp,
  p.max_hp,
  p.credits,
  au.email
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'test@test.com';

-- Ver todas las tareas completadas
SELECT 
  id,
  title,
  xp_reward,
  status,
  completed_at
FROM tasks
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@test.com')
  AND status = 'done'
ORDER BY completed_at DESC;

-- Calcular XP total ganado
SELECT 
  SUM(xp_reward) as total_xp_earned
FROM tasks
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@test.com')
  AND status = 'done';
