# Winter League Cricket - Quick Start Guide

## 🏏 Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

### 3. Initialize Database (Optional - for PostgreSQL)
```bash
# Make sure PostgreSQL is running
npm run db:init
```

### 4. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### 5. Access Admin Panel
- Go to http://localhost:3000/admin
- Default password: `admin123` (change in `.env.local`)

---

## 📁 Project Structure

```
├── pages/              # Next.js pages and routes
│   ├── api/           # API endpoints
│   ├── admin/         # Admin panel pages
│   └── index.js       # Homepage
├── components/        # React components
├── styles/           # CSS modules
├── data/             # Data management (will migrate to DB)
├── lib/              # Utilities
│   ├── db.js         # Database connection
│   └── auth.js       # Authentication helpers
├── database/         # Database files
│   ├── schema.sql    # PostgreSQL schema
│   └── init.sh       # Initialization script
├── public/           # Static files
└── context/          # React context providers
```

---

## 🗄️ Database

Currently using file-based storage in `/data` folder.  
PostgreSQL integration ready - see `PRODUCTION_DEPLOYMENT.md` for setup.

---

## 🚀 Production Deployment

See detailed guide: [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

**Quick Deploy to Vercel:**
```bash
npm install -g vercel
vercel
```

---

## 📚 Documentation

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md) - Complete deployment instructions
- [Email Setup](./NODEMAILER_SETUP.md) - Configure email notifications
- [PayFast Integration](./CUSTOMER_PROFILE_PAYFAST_GUIDE.md) - Payment gateway setup
- [Order Automation](./ORDER_EMAIL_AUTOMATION_GUIDE.md) - Order email system
- [Funnels Guide](./FUNNELS_GUIDE.md) - Sales funnel builder
- [Forms Guide](./FUNNEL_BUTTON_IMPLEMENTATION.md) - Form system

---

## 🔑 Key Features

### For Customers
- 🛒 Shopping cart and checkout
- 📱 Mobile-responsive design
- 🏏 Team registration portal
- 📋 Custom forms
- 💳 PayFast payment integration

### For Admins
- 📊 Dashboard with card-based layout
- 📦 Product management
- 📋 Form builder
- 🔄 Sales funnel creator
- 🎨 Landing page builder
- 📧 Email configuration
- 💰 Payout management
- 🛍️ Order tracking

---

## 🛠️ Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run db:init    # Initialize database
npm run db:migrate # Run database migrations
```

---

## ⚙️ Configuration

### Environment Variables
Key variables in `.env.local`:

```env
# Admin
ADMIN_PASSWORD=your_secure_password
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password

# Database (optional)
DATABASE_URL=postgresql://...
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=winterleague_cricket
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# PayFast (optional)
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
```

---

## 🔒 Security

- Admin panel protected by password (configurable in `.env.local`)
- Session-based authentication
- Security headers configured in `next.config.js`
- HTTPS required in production
- Password hashing with bcrypt

---

## 📱 Admin Panel Access

**URL:** `/admin`

**Features:**
- Homepage Editor
- Product Management
- Form Builder
- Sales Funnels
- Landing Pages
- Orders & Payouts
- Settings & Menus
- Categories & Pages

---

## 🆘 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
# Clear cache
rm -rf .next
npm run build
```

---

## 📞 Support

For production deployment help, see [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

---

## 📝 License

Private - Winter League Cricket E-Commerce Platform
