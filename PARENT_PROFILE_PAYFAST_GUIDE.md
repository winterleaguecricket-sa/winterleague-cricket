# Customer Profile System & PayFast Payment Integration

## Overview
Comprehensive customer profile system with PayFast payment gateway integration for secure checkout processing.

## ✅ Completed Features

### 1. Customer Profile System (`/data/customers.js`)
- **Profile Management**: Full CRUD operations for customer profiles
- **Email-based Lookup**: Returning customers can login with email
- **Profile Fields**:
  - Email (required, unique)
  - First Name & Last Name (required)
  - Phone Number (required)
  - ID Number (optional)
  - Date of Birth (optional)
  - Company (optional)
  - Shipping Address (saved and pre-filled)
- **Order History**: Complete order tracking per customer
- **Functions**:
  - `getAllProfiles()` - Get all customer profiles
  - `getProfileByEmail(email)` - Find customer by email
  - `createProfile(data)` - Create new customer with duplicate check
  - `updateProfile(id, data)` - Update customer information
  - `deleteProfile(id)` - Remove customer
  - `addOrderToProfile(customerId, order)` - Add order to customer history
  - `getProfileOrders(customerId)` - Get customer's order history

### 2. Multi-Step Checkout (`/pages/checkout.js`)
- **Step 1: Profile**
  - New customer registration
  - Returning customer login (email lookup)
  - Comprehensive profile fields
  - Error validation
- **Step 2: Shipping**
  - Full shipping address form
  - Pre-fills for returning customers
  - Delivery notes field
  - Back navigation
- **Step 3: Payment**
  - Order summary review
  - Customer details confirmation
  - PayFast payment button
  - Order creation in customer profile
- **Step 4: Processing**
  - Loading state during PayFast redirect
  - Automatic form submission to PayFast
- **Progress Indicator**: Visual step tracker
- **Order Summary Sidebar**: Live cart display with totals

### 3. PayFast Payment Integration
- **Signature Generation**: MD5 hash with passphrase support
- **Dynamic Form Submission**: Auto-submits to PayFast gateway
- **Test/Production Modes**: Toggle sandbox vs live environment
- **Payment Data**: Includes customer info, order details, callback URLs
- **Security**: 
  - Signature validation
  - Passphrase encryption
  - Unique order IDs

### 4. PayFast Admin Configuration (`/pages/admin/payment.js`)
- **Settings Interface**:
  - Merchant ID input
  - Merchant Key input
  - Passphrase input (optional but recommended)
  - Test Mode toggle
- **Helpful Information**:
  - Callback URLs displayed
  - Test credentials provided
  - Configuration instructions
- **Save Functionality**: Updates siteConfig.paymentConfig

### 5. Payment Webhook (`/pages/api/payfast/notify.js`)
- **ITN (Instant Transaction Notification)**:
  - Receives PayFast payment confirmations
  - Validates signature
  - Logs payment status
  - Updates order status
- **Security**: Signature verification prevents fraud

### 6. Success Page (`/pages/checkout/success.js`)
- **Order Confirmation**:
  - Success message with order number
  - Cart auto-cleared
  - Countdown redirect to home
  - Continue shopping link

### 7. Admin Settings Enhancement
- Added quick links to:
  - Button Manager
  - Menu Manager
  - Payment Settings

## 🔧 Configuration

### PayFast Setup
1. Go to Admin → Settings → Payment Settings
2. Enter your PayFast credentials:
   - **Merchant ID**: From PayFast dashboard
   - **Merchant Key**: From PayFast dashboard
   - **Passphrase**: Set in PayFast Integration settings (recommended)
3. Enable Test Mode for sandbox testing
4. Configure callback URLs in PayFast dashboard:
   - Return URL: `https://yourdomain.com/checkout/success`
   - Cancel URL: `https://yourdomain.com/checkout`
   - Notify URL: `https://yourdomain.com/api/payfast/notify`

### Test Credentials (Sandbox)
```
Merchant ID: 10000100
Merchant Key: 46f0cd694581a
Passphrase: (leave empty for sandbox)
```

## 📝 Customer Checkout Flow

1. **Add to Cart**: Products added with size selection
2. **Go to Checkout**: Click checkout button
3. **Profile Step**:
   - New customers fill registration form
   - Returning customers enter email to login
   - Profile validated and created/retrieved
4. **Shipping Step**:
   - Enter delivery address
   - Pre-filled for returning customers
   - Optional delivery notes
5. **Payment Step**:
   - Review order summary
   - Confirm customer and shipping details
   - Click "Pay with PayFast"
6. **PayFast Gateway**:
   - Redirected to secure PayFast page
   - Complete payment
   - Returned to success page
7. **Success**:
   - Order confirmation displayed
   - Cart cleared
   - Order saved to customer profile

## 💾 Data Storage

### Customer Profiles (`customers` array)
```javascript
{
  id: 1,
  email: "customer@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "0123456789",
  idNumber: "",
  dateOfBirth: "",
  company: "",
  shippingAddress: {
    address: "123 Main St",
    address2: "Apt 4",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    country: "South Africa"
  },
  orders: [
    {
      orderId: "ORD1234567890",
      items: [...],
      total: 999.99,
      status: "pending",
      paymentMethod: "payfast",
      createdAt: "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Payment Configuration (`siteConfig.paymentConfig`)
```javascript
{
  payfast: {
    merchantId: "10000100",
    merchantKey: "46f0cd694581a",
    passphrase: "",
    testMode: true
  }
}
```

## 🔐 Security Features

- Email uniqueness validation
- PayFast signature verification (MD5)
- Passphrase encryption support
- Returning customer authentication
- Order ID unique generation
- Webhook signature validation

## 🎯 Key Benefits

1. **Customer Retention**: Profiles enable faster repeat purchases
2. **Order Tracking**: Complete order history per customer
3. **Secure Payments**: PayFast integration with signature validation
4. **User Experience**: Multi-step flow with progress indicators
5. **Admin Control**: Easy PayFast configuration via admin panel
6. **Flexibility**: Test mode for development, production for live sales
7. **South African Focus**: PayFast is SA's leading payment gateway

## 📱 Next Steps (Optional Enhancements)

1. **Email Notifications**: Send order confirmations via email
2. **Parent Portal**: Let parents/players view their order history
3. **Admin Orders Page**: View and manage all customer orders
4. **Inventory Management**: Auto-update stock after purchases
5. **Shipping Integration**: Connect with courier services
6. **Invoice Generation**: Create PDF invoices for orders
7. **Customer Analytics**: Track customer lifetime value
8. **Abandoned Cart**: Email reminders for incomplete checkouts

## 🚀 Testing Checklist

- [ ] Create new customer profile
- [ ] Login as returning customer
- [ ] Add products to cart with sizes
- [ ] Complete checkout flow
- [ ] Test PayFast sandbox payment
- [ ] Verify success page redirect
- [ ] Check order saved in customer profile
- [ ] Configure PayFast credentials in admin
- [ ] Test webhook notification (ITN)
- [ ] Verify cart cleared after success

## 📞 Support

For PayFast support: https://www.payfast.co.za/support/
For integration docs: https://developers.payfast.co.za/
