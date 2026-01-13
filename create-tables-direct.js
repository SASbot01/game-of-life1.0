#!/usr/bin/env node

/**
 * Script directo para crear tablas usando Supabase REST API
 * Este script ejecuta el SQL directamente sin necesidad de RPC
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
        envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🚀 Creación Automática de Tablas en Supabase\n');
console.log(`📦 Proyecto: ${SUPABASE_URL}\n`);

// Importar dinámicamente el cliente de Supabase
(async () => {
    try {
        // Intentar importar @supabase/supabase-js
        const { createClient } = await import('@supabase/supabase-js');

        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

        console.log('✅ Cliente de Supabase inicializado\n');
        console.log('📋 Creando tablas necesarias...\n');

        // Leer el SQL consolidado
        const sqlPath = path.join(__dirname, '.gemini', 'antigravity', 'brain', '906c9ff8-2949-45fa-8ccd-9e8a56730946', 'complete_migration.sql');

        if (!fs.existsSync(sqlPath)) {
            console.error('❌ No se encontró el archivo SQL de migración');
            console.error(`   Ruta esperada: ${sqlPath}`);
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📄 SQL cargado: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

        // Como Supabase no expone un endpoint directo para ejecutar SQL arbitrario
        // desde el cliente JS (por seguridad), necesitamos usar el SQL Editor manual
        // O usar Supabase CLI

        console.log('⚠️  IMPORTANTE: Supabase no permite ejecutar SQL arbitrario desde JavaScript por seguridad.\n');
        console.log('📝 Tienes 2 opciones:\n');

        console.log('OPCIÓN 1: Usar Supabase CLI (Recomendado)');
        console.log('──────────────────────────────────────────');
        console.log('1. Instalar Supabase CLI:');
        console.log('   npm install -g supabase\n');
        console.log('2. Inicializar el proyecto:');
        console.log('   supabase init\n');
        console.log('3. Vincular con tu proyecto:');
        console.log('   supabase link --project-ref ytsiacpyjaguofxpywpg\n');
        console.log('4. Copiar el SQL a supabase/migrations/:');
        console.log('   cp .gemini/antigravity/brain/906c9ff8-2949-45fa-8ccd-9e8a56730946/complete_migration.sql supabase/migrations/20260107_complete_setup.sql\n');
        console.log('5. Aplicar migraciones:');
        console.log('   supabase db push\n');

        console.log('\nOPCIÓN 2: SQL Editor Manual (Más rápido)');
        console.log('──────────────────────────────────────────');
        console.log('1. Copiar SQL al portapapeles:');
        console.log('   cat .gemini/antigravity/brain/906c9ff8-2949-45fa-8ccd-9e8a56730946/complete_migration.sql | pbcopy\n');
        console.log('2. Abrir SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/editor\n');
        console.log('3. Pegar (Cmd+V) y ejecutar (Cmd+Enter)\n');

        // Intentar copiar al portapapeles automáticamente
        const { exec } = require('child_process');
        exec(`cat "${sqlPath}" | pbcopy`, (error) => {
            if (!error) {
                console.log('✅ SQL copiado al portapapeles automáticamente!\n');
                console.log('   Solo ve al SQL Editor y pega (Cmd+V)\n');
            }
        });

        // Abrir el navegador
        exec(`open "https://supabase.com/dashboard/project/ytsiacpyjaguofxpywpg/editor"`, (error) => {
            if (!error) {
                console.log('🌐 Abriendo SQL Editor en el navegador...\n');
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Instalando dependencias necesarias...\n');

        const { exec } = require('child_process');
        exec('npm install @supabase/supabase-js', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error instalando dependencias');
                console.error('   Ejecuta manualmente: npm install @supabase/supabase-js');
            } else {
                console.log('✅ Dependencias instaladas. Ejecuta el script nuevamente.');
            }
        });
    }
})();
