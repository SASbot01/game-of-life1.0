#!/bin/bash

# Script de migración automática para Supabase
# Este script instala Supabase CLI y ejecuta las migraciones automáticamente

set -e  # Salir si hay algún error

echo "🚀 Iniciando migración automática de Supabase..."
echo ""

# Verificar si Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "📦 Instalando Supabase CLI..."
    brew install supabase/tap/supabase
    echo "✅ Supabase CLI instalado"
    echo ""
else
    echo "✅ Supabase CLI ya está instalado"
    echo ""
fi

# Verificar que existe el directorio de migraciones
if [ ! -d "supabase/migrations" ]; then
    echo "📁 Creando estructura de directorios de Supabase..."
    mkdir -p supabase/migrations
fi

# Copiar el SQL consolidado a las migraciones
echo "📄 Preparando archivo de migración..."
MIGRATION_FILE="supabase/migrations/20260107000000_complete_setup.sql"
cp "$HOME/.gemini/antigravity/brain/906c9ff8-2949-45fa-8ccd-9e8a56730946/complete_migration.sql" "$MIGRATION_FILE"
echo "✅ Migración copiada a: $MIGRATION_FILE"
echo ""

# Obtener el project ref del .env
PROJECT_REF=$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d'"' -f2)
echo "📦 Proyecto Supabase: $PROJECT_REF"
echo ""

# Verificar si ya está vinculado
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "🔗 Vinculando con proyecto Supabase..."
    echo "   (Se abrirá el navegador para autenticación)"
    echo ""
    supabase link --project-ref "$PROJECT_REF"
    echo ""
fi

# Ejecutar las migraciones
echo "🚀 Ejecutando migraciones en Supabase..."
echo ""
supabase db push

echo ""
echo "✅ ¡Migración completada exitosamente!"
echo ""
echo "📋 Tablas creadas:"
echo "   ✓ profiles"
echo "   ✓ game_rules"
echo "   ✓ habits"
echo "   ✓ tasks"
echo "   ✓ transactions"
echo "   ✓ notes"
echo "   ✓ finance_assets"
echo "   ✓ finance_categories"
echo "   ✓ pockets"
echo "   ✓ projects"
echo "   ✓ daily_logs"
echo "   ✓ calendar_events"
echo "   ✓ google_calendar_tokens"
echo "   ✓ areas"
echo "   ✓ habit_logs"
echo ""
echo "🎉 Tu aplicación ya tiene todas las tablas necesarias!"
echo "🔄 Recarga tu aplicación para ver los cambios."
