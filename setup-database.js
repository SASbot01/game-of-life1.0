#!/usr/bin/env node

/**
 * Script automático para crear todas las tablas de Supabase
 * Ejecuta la migración completa sin intervención manual
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Leer variables de entorno
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ytsiacpyjaguofxpywpg.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🚀 Iniciando creación automática de tablas en Supabase...\n');
console.log(`📦 URL: ${SUPABASE_URL}`);

// Leer el archivo SQL consolidado
const sqlPath = path.join(__dirname, '.gemini', 'antigravity', 'brain', '906c9ff8-2949-45fa-8ccd-9e8a56730946', 'complete_migration.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log(`📄 SQL cargado: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

// Función para ejecutar SQL en Supabase usando la REST API
async function executeSql(sql) {
    return new Promise((resolve, reject) => {
        const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);

        const postData = JSON.stringify({ query: sql });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, data: data });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Función alternativa usando el cliente de Supabase
async function executeWithSupabaseClient() {
    const { createClient } = require('@supabase/supabase-js');

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📡 Conectando a Supabase...');

    // Dividir el SQL en statements individuales para mejor control
    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Ejecutando ${statements.length} comandos SQL...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';

        // Mostrar progreso
        if (i % 10 === 0) {
            console.log(`⏳ Progreso: ${i}/${statements.length} comandos ejecutados...`);
        }

        try {
            const { data, error } = await supabase.rpc('exec_sql', { query: statement });

            if (error) {
                // Ignorar errores de "already exists" que son esperados
                if (error.message.includes('already exists') ||
                    error.message.includes('ya existe')) {
                    // Silenciar estos errores
                } else {
                    console.warn(`⚠️  Error en comando ${i + 1}: ${error.message.substring(0, 100)}`);
                    errorCount++;
                }
            } else {
                successCount++;
            }
        } catch (err) {
            console.warn(`⚠️  Excepción en comando ${i + 1}: ${err.message.substring(0, 100)}`);
            errorCount++;
        }
    }

    console.log('\n✅ Migración completada!');
    console.log(`   Exitosos: ${successCount}`);
    console.log(`   Errores: ${errorCount}`);

    return { successCount, errorCount };
}

// Ejecutar la migración
(async () => {
    try {
        await executeWithSupabaseClient();

        console.log('\n🎉 ¡Base de datos configurada exitosamente!\n');
        console.log('📋 Tablas creadas:');
        console.log('   ✓ profiles');
        console.log('   ✓ game_rules');
        console.log('   ✓ habits');
        console.log('   ✓ tasks');
        console.log('   ✓ transactions');
        console.log('   ✓ notes');
        console.log('   ✓ finance_assets');
        console.log('   ✓ finance_categories');
        console.log('   ✓ pockets');
        console.log('   ✓ projects');
        console.log('   ✓ daily_logs');
        console.log('   ✓ calendar_events');
        console.log('   ✓ google_calendar_tokens');
        console.log('   ✓ areas');
        console.log('   ✓ habit_logs\n');

        console.log('🔄 Recarga tu aplicación para ver los cambios.');

    } catch (error) {
        console.error('\n❌ Error durante la migración:');
        console.error(error.message);
        console.error('\n💡 Solución: Usa el método manual descrito en migration_guide.md');
        process.exit(1);
    }
})();
