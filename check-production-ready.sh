#!/bin/bash
# Production Readiness Check Script
# Winter League Cricket

echo "🏏 Winter League Cricket - Production Readiness Check"
echo "======================================================"
echo ""

READY=true
WARNINGS=0

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ❌ Node.js not found"
    READY=false
fi

# Check npm
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm installed: $NPM_VERSION"
else
    echo "   ❌ npm not found"
    READY=false
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ⚠️  node_modules not found - run 'npm install'"
    WARNINGS=$((WARNINGS + 1))
fi

# Check .env files
echo ""
echo "🔐 Checking environment files..."
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "   ✅ Environment file found"
    
    # Check for critical variables
    if [ -f ".env.local" ]; then
        ENV_FILE=".env.local"
    else
        ENV_FILE=".env"
    fi
    
    if grep -q "ADMIN_PASSWORD=" "$ENV_FILE" 2>/dev/null; then
        if grep -q "ADMIN_PASSWORD=admin123" "$ENV_FILE" 2>/dev/null; then
            echo "   ⚠️  WARNING: Default admin password detected!"
            echo "      Change ADMIN_PASSWORD in $ENV_FILE"
            WARNINGS=$((WARNINGS + 1))
        else
            echo "   ✅ Custom admin password set"
        fi
    else
        echo "   ⚠️  ADMIN_PASSWORD not found in $ENV_FILE"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "JWT_SECRET=" "$ENV_FILE" 2>/dev/null; then
        echo "   ✅ JWT_SECRET configured"
    else
        echo "   ⚠️  JWT_SECRET not found in $ENV_FILE"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "DATABASE_URL=" "$ENV_FILE" 2>/dev/null; then
        echo "   ✅ DATABASE_URL configured"
    else
        echo "   ⚠️  DATABASE_URL not configured (optional for dev)"
    fi
else
    echo "   ❌ No .env.local or .env file found"
    echo "      Copy .env.example to .env.local and configure"
    READY=false
fi

# Check PostgreSQL (optional)
echo ""
echo "🗄️  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "   ✅ PostgreSQL client installed"
    
    # Try to connect if DATABASE_URL is set
    if [ -f ".env.local" ]; then
        export $(cat .env.local | grep DATABASE_URL | xargs)
    fi
    
    if [ -n "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
            echo "   ✅ Database connection successful"
        else
            echo "   ⚠️  Cannot connect to database"
            echo "      Run 'npm run db:init' to initialize"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
else
    echo "   ⚠️  PostgreSQL not installed (optional for development)"
fi

# Check build files
echo ""
echo "🏗️  Checking build..."
if [ -d ".next" ]; then
    echo "   ✅ Production build exists"
else
    echo "   ⚠️  No production build found"
    echo "      Run 'npm run build' to create production build"
    WARNINGS=$((WARNINGS + 1))
fi

# Check critical files
echo ""
echo "📄 Checking critical files..."
CRITICAL_FILES=(
    "next.config.js"
    "package.json"
    "pages/admin.js"
    "lib/db.js"
    "lib/auth.js"
    "database/schema.sql"
    "database/init.sh"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file missing"
        READY=false
    fi
done

# Check database directory
if [ -d "database" ]; then
    if [ -x "database/init.sh" ]; then
        echo "   ✅ database/init.sh is executable"
    else
        echo "   ⚠️  database/init.sh not executable"
        echo "      Run: chmod +x database/init.sh"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Security check
echo ""
echo "🔒 Security checks..."
if [ -f ".gitignore" ]; then
    if grep -q ".env" ".gitignore" 2>/dev/null; then
        echo "   ✅ .env files in .gitignore"
    else
        echo "   ⚠️  .env not in .gitignore"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Final summary
echo ""
echo "======================================================"
if [ "$READY" = true ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! Ready for production."
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update environment variables (especially ADMIN_PASSWORD)"
    echo "   2. Run 'npm run db:init' to setup database"
    echo "   3. Run 'npm run build' to create production build"
    echo "   4. Deploy following PRODUCTION_DEPLOYMENT.md"
    exit 0
elif [ "$READY" = true ]; then
    echo "⚠️  System ready with $WARNINGS warning(s)"
    echo ""
    echo "📝 Recommended actions:"
    echo "   - Review warnings above"
    echo "   - Update configurations as needed"
    echo "   - Run 'npm run build' to test production build"
    exit 1
else
    echo "❌ System NOT ready for production"
    echo ""
    echo "📝 Required actions:"
    echo "   - Fix errors above"
    echo "   - Install missing dependencies"
    echo "   - Configure environment variables"
    exit 2
fi
