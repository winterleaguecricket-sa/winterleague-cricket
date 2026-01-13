#!/bin/bash
# Database initialization script for Winter League Cricket

echo "🏏 Initializing Winter League Cricket Database..."

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-winterleague_cricket}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

echo "📊 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"

# Check if PostgreSQL is running
echo ""
echo "🔍 Checking PostgreSQL connection..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw postgres; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ Cannot connect to PostgreSQL. Please ensure:"
    echo "   1. PostgreSQL is installed and running"
    echo "   2. Connection details in .env.local are correct"
    echo "   3. You have the necessary permissions"
    exit 1
fi

# Create database if it doesn't exist
echo ""
echo "🗄️  Creating database if not exists..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' is ready"
else
    echo "❌ Failed to create database"
    exit 1
fi

# Run schema
echo ""
echo "📋 Running database schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema created successfully"
else
    echo "❌ Failed to create schema"
    exit 1
fi

# Run seed data if exists
if [ -f database/seed.sql ]; then
    echo ""
    echo "🌱 Seeding initial data..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/seed.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Data seeded successfully"
    else
        echo "⚠️  Warning: Failed to seed data"
    fi
fi

echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update your .env.local with correct database credentials"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Access the admin panel to configure your site"
