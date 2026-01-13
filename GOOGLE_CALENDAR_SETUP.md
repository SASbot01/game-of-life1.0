# Configuración de Google Calendar

## Guía Paso a Paso para Conectar Google Calendar con Chronos

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Click en el menú desplegable de proyectos (arriba a la izquierda)
3. Click en "NEW PROJECT"
4. Nombre del proyecto: `Game of Life Calendar`
5. Click en "CREATE"

### Paso 2: Habilitar Google Calendar API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Google Calendar API"
3. Click en "Google Calendar API"
4. Click en "ENABLE"

### Paso 3: Configurar OAuth Consent Screen

1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External** (a menos que tengas Google Workspace)
3. Click en "CREATE"
4. Completa la información:
   - **App name:** Game of Life
   - **User support email:** Tu email
   - **Developer contact information:** Tu email
5. Click en "SAVE AND CONTINUE"
6. En **Scopes**, click en "ADD OR REMOVE SCOPES"
7. Busca y selecciona:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
8. Click en "UPDATE" y luego "SAVE AND CONTINUE"
9. En **Test users**, agrega tu email de Google
10. Click en "SAVE AND CONTINUE"

### Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Click en "+ CREATE CREDENTIALS"
3. Selecciona "OAuth client ID"
4. **Application type:** Web application
5. **Name:** Game of Life Web Client
6. En **Authorized redirect URIs**, click en "+ ADD URI" y agrega:
   - **Producción:** `https://gol.blackwolfsec.io/settings`
   - **Desarrollo local:** `http://localhost:5173/settings`
7. Click en "CREATE"
8. **¡IMPORTANTE!** Copia el **Client ID** y **Client Secret** que aparecen

### Paso 5: Configurar Variables de Entorno en Supabase

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Project Settings** → **Edge Functions**
4. Scroll hasta **Secrets**
5. Agrega las siguientes variables:

```
GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
```

6. Click en "Save" para cada una

### Paso 6: Desplegar Edge Functions

Abre tu terminal en el directorio del proyecto y ejecuta:

```bash
# Login a Supabase (si no lo has hecho)
npx supabase login

# Link al proyecto
npx supabase link --project-ref tu-project-ref

# Desplegar todas las funciones
npx supabase functions deploy google-calendar-auth
npx supabase functions deploy google-calendar-callback
npx supabase functions deploy google-calendar-sync
```

### Paso 7: Probar la Conexión

1. Abre tu aplicación en `https://gol.blackwolfsec.io`
2. Ve a **Settings** o **Config**
3. Busca la sección "Google Calendar"
4. Click en "Connect Google Calendar"
5. Autoriza los permisos en Google
6. Deberías ver "Connected" ✅
7. Click en "Sync Now"
8. Ve a **Chronos** y verifica que aparecen tus eventos

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL en Google Cloud Console coincida exactamente con tu dominio
- Asegúrate de incluir `/settings` al final
- Para desarrollo local, usa `http://localhost:5173/settings`

### Error: "GOOGLE_CLIENT_ID not configured"
- Verifica que agregaste las variables de entorno en Supabase
- Espera 1-2 minutos después de agregar las variables
- Re-despliega las Edge Functions

### No aparecen eventos en Chronos
- Verifica que diste permisos de lectura de calendario
- Asegúrate de que tienes eventos en tu Google Calendar
- Revisa los logs de Supabase: **Edge Functions** → **Logs**

### Error: "Token expired"
- La función debería renovar automáticamente el token
- Si persiste, desconecta y vuelve a conectar

## Sincronización Automática

Por defecto, los eventos se sincronizan manualmente con el botón "Sync Now".

### Opción 1: Sincronización Programada (Recomendado)

Puedes configurar un cron job en Supabase para sincronizar automáticamente cada hora:

1. Ve a **Database** → **Cron Jobs** en Supabase
2. Crea un nuevo job:

```sql
SELECT cron.schedule(
  'sync-google-calendars',
  '0 * * * *', -- Cada hora
  $$
  SELECT net.http_post(
    url := 'https://[tu-project-ref].supabase.co/functions/v1/google-calendar-sync',
    headers := '{"Authorization": "Bearer [tu-service-role-key]", "Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'userId', user_id,
      'timeMin', NOW()::text,
      'timeMax', (NOW() + INTERVAL '30 days')::text
    )
  )
  FROM google_calendar_tokens;
  $$
);
```

### Opción 2: Webhook de Google Calendar (Avanzado)

Para sincronización en tiempo real, puedes configurar push notifications de Google Calendar.

## Seguridad

- ✅ Los tokens se almacenan encriptados en Supabase
- ✅ OAuth 2.0 estándar de Google
- ✅ Solo permisos de lectura de calendario
- ✅ Tokens se renuevan automáticamente
- ✅ HTTPS obligatorio en producción

## Límites de Google Calendar API

- **Cuota diaria:** 1,000,000 requests
- **Rate limit:** 10 requests/segundo por usuario
- **Eventos por request:** Máximo 250

Para uso normal, estos límites son más que suficientes.

## Próximos Pasos

Una vez configurado, podrás:
- ✅ Ver eventos de Google Calendar en Chronos
- ✅ Sincronizar manualmente con un click
- ✅ Los eventos se actualizan automáticamente (si configuras cron)
- ✅ Eventos de Google se distinguen visualmente en Chronos

## Soporte

Si tienes problemas:
1. Revisa los logs en Supabase Dashboard → Edge Functions → Logs
2. Verifica que las credenciales estén correctas
3. Asegúrate de que el redirect URI coincida exactamente
