#!/usr/bin/env node

/**
 * Script para ejecutar la migración del bucket de avatares en Supabase
 * Este script crea el bucket 'avatars' y configura las políticas RLS
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

console.log('🚀 Ejecutando migración de avatares en Supabase\n');
console.log(`📦 Proyecto: ${SUPABASE_URL}\n`);

// Leer el SQL de migración
const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260108120000_create_avatars_bucket.sql');

if (!fs.existsSync(sqlPath)) {
    console.error('❌ No se encontró el archivo SQL de migración');
    console.error(`   Ruta esperada: ${sqlPath}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');
console.log(`📄 SQL cargado: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

console.log('⚠️  IMPORTANTE: Supabase no permite ejecutar SQL arbitrario desde JavaScript por seguridad.\n');
console.log('📝 Para ejecutar esta migración, tienes 2 opciones:\n');

console.log('OPCIÓN 1: Usar Supabase SQL Editor (Recomendado)');
console.log('──────────────────────────────────────────');
console.log('1. Copiar SQL al portapapeles:');
console.log(`   cat "${sqlPath}" | pbcopy\n`);
console.log('2. Abrir SQL Editor:');
console.log(`   https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/sql/new\n`);
console.log('3. Pegar (Cmd+V) y ejecutar (Cmd+Enter)\n');

console.log('\nOPCIÓN 2: Usar Supabase CLI');
console.log('──────────────────────────────────────────');
console.log('1. Instalar Supabase CLI (si no lo tienes):');
console.log('   npm install -g supabase\n');
console.log('2. Vincular con tu proyecto:');
console.log(`   supabase link --project-ref ${SUPABASE_URL.split('//')[1].split('.')[0]}\n`);
console.log('3. Aplicar migración:');
console.log('   supabase db push\n');

// Intentar copiar al portapapeles automáticamente
const { exec } = require('child_process');
exec(`cat "${sqlPath}" | pbcopy`, (error) => {
    if (!error) {
        console.log('✅ SQL copiado al portapapeles automáticamente!\n');
        console.log('   Solo ve al SQL Editor y pega (Cmd+V)\n');
    }
});

// Abrir el navegador
const projectRef = SUPABASE_URL.split('//')[1].split('.')[0];
exec(`open "https://supabase.com/dashboard/project/${projectRef}/sql/new"`, (error) => {
    if (!error) {
        console.log('🌐 Abriendo SQL Editor en el navegador...\n');
    }
});

console.log('\n📌 NOTA: Después de ejecutar la migración, el bucket "avatars" estará listo.');
console.log('   Los usuarios podrán subir sus fotos de perfil desde el Dashboard.\n');
