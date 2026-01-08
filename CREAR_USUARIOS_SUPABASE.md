# 🎮 Cómo Crear Usuarios en Game of Life SaaS

Esta guía te muestra **3 métodos diferentes** para crear usuarios en la tabla de `profiles` de tu proyecto Supabase.

---

## 📋 Estructura de la Tabla `profiles`

La tabla `profiles` tiene la siguiente estructura:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  max_xp_for_next_level INTEGER NOT NULL DEFAULT 100,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  credits DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  setup_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **⚠️ IMPORTANTE:** La tabla `profiles` está vinculada a `auth.users`. Esto significa que **primero debes crear un usuario en Auth**, y luego se crea automáticamente su perfil gracias al trigger `on_auth_user_created`.

---

## 🚀 Método 1: Registro Normal (Recomendado)

### A través de la Interfaz de la Aplicación

1. **Inicia la aplicación localmente:**
   ```bash
   cd /Users/s4sf/Desktop/life-hud-main
   npm run dev
   ```

2. **Abre el navegador en:** `http://localhost:5173`

3. **Regístrate normalmente:**
   - Ve a la página de registro
   - Ingresa email y contraseña
   - Completa el wizard de configuración inicial

4. **¡Listo!** El sistema automáticamente:
   - Crea el usuario en `auth.users`
   - Crea el perfil en `profiles` (gracias al trigger)
   - Crea las reglas del juego en `game_rules`

---

## 🔧 Método 2: Crear Usuario Manualmente en Supabase Dashboard

### Paso 1: Crear el Usuario en Auth

1. **Ve al Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/auth/users
   ```

2. **Haz clic en "Add User" → "Create new user"**

3. **Completa los datos:**
   - **Email:** `usuario@ejemplo.com`
   - **Password:** `TuContraseñaSegura123!`
   - **Auto Confirm User:** ✅ (marca esta opción)

4. **Haz clic en "Create User"**

### Paso 2: Verificar que se Creó el Perfil Automáticamente

El trigger `on_auth_user_created` debería haber creado automáticamente:
- Un registro en `profiles`
- Un registro en `game_rules`

**Verifica en el SQL Editor:**

```sql
-- Ver el usuario recién creado
SELECT 
  p.id,
  p.username,
  p.level,
  p.current_xp,
  p.hp,
  p.credits,
  p.is_onboarded,
  p.created_at
FROM profiles p
WHERE p.username LIKE '%usuario@ejemplo.com%';
```

---

## 💻 Método 3: Crear Usuario con SQL Directo

Si el trigger no funciona o quieres crear usuarios de prueba rápidamente:

### Opción A: Usando Supabase SQL Editor

1. **Ve al SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/sql/new
   ```

2. **Ejecuta este SQL:**

```sql
-- 1. Crear usuario en auth.users (usando la función de Supabase)
-- NOTA: Supabase no permite INSERT directo en auth.users por seguridad
-- Debes usar el Dashboard o la API de Auth

-- 2. Si ya tienes el UUID del usuario de auth, puedes crear el perfil manualmente:
INSERT INTO public.profiles (
  id,
  username,
  avatar_url,
  level,
  current_xp,
  max_xp_for_next_level,
  hp,
  max_hp,
  credits,
  is_onboarded
) VALUES (
  'AQUI-VA-EL-UUID-DEL-USUARIO-DE-AUTH',  -- Reemplaza con el UUID real
  'nombre_usuario',
  NULL,  -- o una URL de avatar
  1,     -- nivel inicial
  0,     -- XP inicial
  100,   -- XP necesaria para nivel 2
  100,   -- HP actual
  100,   -- HP máxima
  0,     -- créditos iniciales
  false  -- no ha completado onboarding
);

-- 3. Crear las reglas del juego para ese usuario
INSERT INTO public.game_rules (user_id)
VALUES ('AQUI-VA-EL-UUID-DEL-USUARIO-DE-AUTH');
```

### Opción B: Crear Usuario de Prueba Completo

```sql
-- Este script crea un usuario de prueba completo
-- ADVERTENCIA: Solo funciona si tienes acceso directo a auth.users

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generar un UUID para el nuevo usuario
  new_user_id := gen_random_uuid();
  
  -- Crear perfil
  INSERT INTO public.profiles (
    id,
    username,
    level,
    current_xp,
    max_xp_for_next_level,
    hp,
    max_hp,
    credits,
    is_onboarded
  ) VALUES (
    new_user_id,
    'usuario_prueba_' || substring(new_user_id::text, 1, 8),
    1,
    0,
    100,
    100,
    100,
    0,
    false
  );
  
  -- Crear reglas del juego
  INSERT INTO public.game_rules (user_id)
  VALUES (new_user_id);
  
  -- Mostrar el UUID creado
  RAISE NOTICE 'Usuario de prueba creado con ID: %', new_user_id;
END $$;
```

> **⚠️ LIMITACIÓN:** Este método crea el perfil pero NO crea el usuario en `auth.users`, por lo que **no podrás hacer login**. Solo es útil para pruebas de base de datos.

---

## 🔍 Verificar Usuarios Existentes

### Ver todos los usuarios y sus perfiles:

```sql
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  p.username,
  p.level,
  p.current_xp,
  p.hp,
  p.credits,
  p.is_onboarded,
  p.setup_completed_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
```

### Ver usuarios sin perfil (para detectar problemas):

```sql
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

---

## 🛠️ Solución de Problemas

### Problema: El trigger no crea el perfil automáticamente

**Verifica que el trigger existe:**

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Si no existe, créalo:**

```sql
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
```

### Problema: Error de permisos al insertar

Verifica las políticas RLS:

```sql
-- Ver políticas de la tabla profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 📊 Crear Usuarios con Datos Personalizados

Si quieres crear un usuario con stats específicos:

```sql
-- Primero crea el usuario en Auth Dashboard, luego actualiza su perfil:
UPDATE public.profiles
SET 
  username = 'Guerrero Legendario',
  level = 10,
  current_xp = 500,
  max_xp_for_next_level = 1000,
  hp = 150,
  max_hp = 150,
  credits = 5000.00,
  is_onboarded = true,
  setup_completed_at = now()
WHERE id = 'UUID-DEL-USUARIO';
```

---

## 🎯 Resumen Rápido

| Método | Ventaja | Desventaja |
|--------|---------|------------|
| **Registro en App** | ✅ Método oficial, todo funciona | Requiere app corriendo |
| **Dashboard Supabase** | ✅ Rápido y visual | Manual, uno por uno |
| **SQL Directo** | ✅ Bulk creation, personalizable | No crea auth.users |

---

## 📝 Notas Importantes

1. **El `id` de `profiles` DEBE coincidir con el `id` de `auth.users`**
2. **El trigger automático es la forma más segura** de mantener sincronizados auth y profiles
3. **No puedes crear usuarios en `auth.users` directamente con SQL** por seguridad de Supabase
4. **Usa el Dashboard de Auth** para crear usuarios reales que puedan hacer login

---

## 🔗 Enlaces Útiles

- **Auth Users:** https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/auth/users
- **SQL Editor:** https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/sql/new
- **Table Editor (profiles):** https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/editor

---

**¿Necesitas ayuda?** Revisa los logs de la aplicación o contacta al equipo de desarrollo.
