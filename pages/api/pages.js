// API endpoint for custom pages CRUD operations
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'pages.json');

// Default pages - seeded for footer links
const defaultPages = [
  // Company Section
  {
    id: 1,
    title: "About Us",
    slug: "about",
    category: "company",
    content: `# About Winter League Cricket

Welcome to **Winter League Cricket**, South Africa's premier destination for cricket excellence.

## Our Story

Founded with a passion for the gentleman's game, Winter League Cricket has been serving cricket enthusiasts across South Africa since our inception. We believe in making quality cricket accessible to everyone, from beginners taking their first steps to seasoned professionals perfecting their craft.

## Our Mission

To foster the growth of cricket in South Africa by providing:
- **Quality Equipment** at competitive prices
- **Professional Training** programs for all skill levels
- **Community Events** that bring players together
- **Youth Development** initiatives to nurture future talent

## What Sets Us Apart

- 🏏 **Expert Knowledge** - Our team comprises former players and coaches
- ⭐ **Quality Assurance** - We only stock equipment we'd use ourselves
- 🚚 **Fast Delivery** - Nationwide shipping within 3-5 business days
- 💯 **Customer First** - Your satisfaction is our top priority

## Contact Us

Have questions? We'd love to hear from you!
- **Email**: info@winterleaguecricket.co.za
- **Phone**: +27 12 345 6789
- **Address**: Pretoria, Gauteng, South Africa`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 2,
    title: "Careers",
    slug: "careers",
    category: "company",
    content: `# Join Our Team

At Winter League Cricket, we're always looking for passionate individuals who share our love for the game.

## Current Openings

We're currently building our team. Check back soon for exciting opportunities in:
- Sales & Customer Service
- Marketing & Social Media
- Logistics & Operations
- Coaching & Training

## Why Work With Us?

- 🏏 Work in an industry you love
- 📈 Growth opportunities
- 👥 Supportive team environment
- 🎯 Make a real impact in SA cricket

## How to Apply

Send your CV and a brief cover letter to **careers@winterleaguecricket.co.za**

Tell us why you're passionate about cricket and how you can contribute to our mission!`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 3,
    title: "Press & Media",
    slug: "press",
    category: "company",
    content: `# Press & Media

## Media Enquiries

For press enquiries, interviews, or media partnerships, please contact our communications team:

**Email**: media@winterleaguecricket.co.za

## Press Kit

Download our press kit for logos, brand guidelines, and company information.

## Recent News

Stay tuned for exciting announcements about:
- New product launches
- Community events
- Partnership announcements
- Player sponsorships

## Social Media

Follow us on social media for the latest updates:
- Facebook: @WinterLeagueCricket
- Instagram: @winterleaguecricket
- Twitter: @WLCricket`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 4,
    title: "Blog",
    slug: "blog",
    category: "company",
    content: `# Cricket Blog

Welcome to the Winter League Cricket blog - your source for cricket tips, news, and insights.

## Latest Articles

*Coming soon!*

We're working on bringing you great content including:
- **Equipment Guides** - How to choose the right gear
- **Training Tips** - Improve your game
- **Match Reports** - Coverage of local cricket
- **Player Interviews** - Stories from the community

## Subscribe

Want to be notified when new articles are published? Sign up to our newsletter!

## Contribute

Are you a cricket enthusiast with insights to share? We welcome guest contributions. Contact us at blog@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 5,
    title: "Contact Us",
    slug: "contact",
    category: "company",
    content: `# Contact Us

We'd love to hear from you! Get in touch with Winter League Cricket.

## Contact Information

**Email**: info@winterleaguecricket.co.za
**Phone**: +27 12 345 6789
**WhatsApp**: +27 82 123 4567

## Business Hours

Monday - Friday: 8:00 AM - 5:00 PM
Saturday: 9:00 AM - 1:00 PM
Sunday: Closed

## Location

Pretoria, Gauteng
South Africa

## Quick Links

- **Orders**: orders@winterleaguecricket.co.za
- **Support**: support@winterleaguecricket.co.za
- **Partnerships**: partners@winterleaguecricket.co.za

## Response Time

We aim to respond to all enquiries within 24 business hours.`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  // Customer Service Section
  {
    id: 6,
    title: "Help Center",
    slug: "help",
    category: "customer-service",
    content: `# Help Center

Welcome to our Help Center. Find answers to common questions below.

## Popular Topics

### Orders
- How do I place an order?
- Can I modify my order after placing it?
- How do I track my order?

### Payments
- What payment methods do you accept?
- Is it safe to pay online?
- When will I be charged?

### Delivery
- How long does delivery take?
- Do you deliver nationwide?
- What are the shipping costs?

### Returns
- What is your return policy?
- How do I initiate a return?
- When will I receive my refund?

## Still Need Help?

Contact our support team:
- **Email**: support@winterleaguecricket.co.za
- **Phone**: +27 12 345 6789
- **Hours**: Mon-Fri, 8AM-5PM`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 7,
    title: "Shipping Information",
    slug: "shipping",
    category: "customer-service",
    content: `# Shipping Information

## Delivery Areas

We deliver nationwide across South Africa.

## Shipping Rates

| Region | Standard | Express |
|--------|----------|---------|
| Gauteng | R50 | R100 |
| Other Provinces | R80 | R150 |
| Remote Areas | R120 | R200 |

**FREE SHIPPING** on orders over R500!

## Delivery Times

- **Standard**: 3-5 business days
- **Express**: 1-2 business days

## Order Processing

Orders placed before 12:00 PM are processed the same day.

## Tracking

Once shipped, you'll receive a tracking number via email and SMS.

## Collection

Free collection available from our Pretoria location.

## International Shipping

Currently, we only ship within South Africa. International shipping coming soon!`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 8,
    title: "Returns & Exchanges",
    slug: "returns",
    category: "customer-service",
    content: `# Returns & Exchanges

## Return Policy

We want you to be completely satisfied with your purchase. If you're not happy, we're here to help.

### Eligibility

- Items must be returned within **30 days** of delivery
- Products must be unused and in original packaging
- Proof of purchase required

### Non-Returnable Items

- Used or damaged equipment
- Personalized items
- Clearance items marked as final sale

## How to Return

1. Email support@winterleaguecricket.co.za with your order number
2. Receive a Return Authorization (RA) number
3. Pack items securely with RA number visible
4. Ship to our returns address

## Refunds

- Refunds processed within 5-7 business days
- Original payment method will be credited
- Shipping costs are non-refundable

## Exchanges

Want a different size or product? We offer free exchanges on eligible items.`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 9,
    title: "Track Order",
    slug: "track-order",
    category: "customer-service",
    content: `# Track Your Order

## How to Track

Enter your order number and email address to track your shipment.

*Tracking functionality coming soon!*

## Order Statuses

- **Processing**: We're preparing your order
- **Shipped**: Your order is on its way
- **Out for Delivery**: Arriving today
- **Delivered**: Order complete

## Tracking Number

Your tracking number is sent via:
- Email confirmation
- SMS notification

## Delivery Issues?

If your order hasn't arrived within the expected timeframe, please contact us:
- **Email**: orders@winterleaguecricket.co.za
- **Phone**: +27 12 345 6789

Have your order number ready for faster assistance.`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 10,
    title: "FAQ",
    slug: "faq",
    category: "customer-service",
    content: `# Frequently Asked Questions

## Orders & Payment

**Q: What payment methods do you accept?**
A: We accept credit/debit cards (Visa, Mastercard), PayFast, and EFT.

**Q: Can I cancel my order?**
A: Orders can be cancelled within 1 hour of placing. Contact us immediately.

**Q: Is my payment information secure?**
A: Yes, we use industry-standard SSL encryption.

## Shipping

**Q: How long does delivery take?**
A: Standard delivery is 3-5 business days. Express is 1-2 days.

**Q: Do you offer free shipping?**
A: Yes, on orders over R500!

## Products

**Q: Are your products genuine?**
A: Absolutely. We only stock authentic, quality equipment.

**Q: Do you offer warranties?**
A: Yes, manufacturer warranties apply to all products.

## Returns

**Q: What is your return policy?**
A: 30-day returns on unused items in original packaging.

**Q: How long do refunds take?**
A: Refunds are processed within 5-7 business days.`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  // Legal Section
  {
    id: 11,
    title: "Privacy Policy",
    slug: "privacy",
    category: "legal",
    content: `# Privacy Policy

**Last Updated**: January 2025

## Introduction

Winter League Cricket ("we", "our", "us") respects your privacy and is committed to protecting your personal data.

## Information We Collect

### Personal Information
- Name and contact details
- Billing and shipping addresses
- Payment information
- Order history

### Automatically Collected
- IP address
- Browser type
- Device information
- Usage data

## How We Use Your Data

- Process and fulfill orders
- Communicate about your orders
- Send marketing communications (with consent)
- Improve our services
- Comply with legal obligations

## Data Sharing

We do not sell your personal data. We share data only with:
- Payment processors
- Delivery partners
- Legal authorities when required

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion
- Withdraw consent

## Contact

For privacy enquiries: privacy@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 12,
    title: "Terms of Service",
    slug: "terms",
    category: "legal",
    content: `# Terms of Service

**Effective Date**: January 2025

## Agreement

By accessing Winter League Cricket, you agree to these Terms of Service.

## Use of Service

You agree to:
- Provide accurate information
- Maintain account security
- Use the service lawfully

## Orders

- Prices are in South African Rand (ZAR)
- We reserve the right to cancel orders
- Availability is not guaranteed until payment confirmed

## Intellectual Property

All content on this site is owned by Winter League Cricket. You may not reproduce without permission.

## Limitation of Liability

We are not liable for:
- Indirect or consequential damages
- Loss of data or profits
- Third-party actions

## Governing Law

These terms are governed by South African law.

## Changes

We may update these terms. Continued use constitutes acceptance.

## Contact

Questions? Email legal@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 13,
    title: "Cookie Policy",
    slug: "cookies",
    category: "legal",
    content: `# Cookie Policy

## What Are Cookies?

Cookies are small text files stored on your device when you visit our website.

## Cookies We Use

### Essential Cookies
Required for the website to function. Cannot be disabled.
- Session management
- Shopping cart
- Security

### Analytics Cookies
Help us understand how visitors use our site.
- Page views
- Traffic sources
- User behavior

### Marketing Cookies
Used to deliver relevant advertisements.
- Ad preferences
- Remarketing

## Managing Cookies

You can control cookies through your browser settings:
- Chrome: Settings > Privacy
- Firefox: Options > Privacy
- Safari: Preferences > Privacy

## Third-Party Cookies

We use services that may set cookies:
- Google Analytics
- Payment processors

## Contact

Questions about cookies? Email privacy@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 14,
    title: "Accessibility",
    slug: "accessibility",
    category: "legal",
    content: `# Accessibility Statement

## Our Commitment

Winter League Cricket is committed to ensuring digital accessibility for people with disabilities.

## Standards

We aim to conform to WCAG 2.1 Level AA guidelines.

## Features

Our site includes:
- Keyboard navigation
- Alt text for images
- Sufficient color contrast
- Resizable text
- Clear headings and structure

## Ongoing Efforts

We continually:
- Review our content
- Train our staff
- Test with assistive technologies
- Address feedback promptly

## Known Issues

We're working to resolve:
- Some PDF documents may not be fully accessible
- Certain interactive features are being improved

## Feedback

Encountered an accessibility barrier? Let us know:
- **Email**: accessibility@winterleaguecricket.co.za
- **Phone**: +27 12 345 6789

We'll respond within 5 business days.`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 15,
    title: "Disclaimer",
    slug: "disclaimer",
    category: "legal",
    content: `# Disclaimer

## General Information

The information on this website is for general informational purposes only.

## No Warranties

We make no representations about:
- Accuracy of information
- Completeness of content
- Suitability for any purpose

## External Links

Links to third-party sites are provided for convenience. We are not responsible for their content.

## Product Information

- Product images are for illustration
- Specifications may change
- Prices subject to change without notice

## Professional Advice

Content on this site does not constitute professional advice. Consult appropriate professionals for specific guidance.

## Limitation

To the maximum extent permitted by law, we exclude all liability for any loss or damage.

## Changes

We may update this disclaimer at any time without notice.

## Contact

Questions? Email legal@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  // Resources Section
  {
    id: 16,
    title: "Sitemap",
    slug: "sitemap",
    category: "resources",
    content: `# Sitemap

## Main Pages
- [Home](/)
- [Premium Equipment](/premium)
- [Training Gear](/training)
- [Forms](/forms)

## Company
- [About Us](/about)
- [Careers](/careers)
- [Press & Media](/press)
- [Blog](/blog)
- [Contact Us](/contact)

## Customer Service
- [Help Center](/help)
- [Shipping Information](/shipping)
- [Returns & Exchanges](/returns)
- [Track Order](/track-order)
- [FAQ](/faq)

## Legal
- [Privacy Policy](/privacy)
- [Terms of Service](/terms)
- [Cookie Policy](/cookies)
- [Accessibility](/accessibility)
- [Disclaimer](/disclaimer)

## Resources
- [Partners](/partners)
- [Affiliate Program](/affiliates)
- [Developers](/developers)
- [Sustainability](/sustainability)`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 17,
    title: "Partners",
    slug: "partners",
    category: "resources",
    content: `# Our Partners

## Strategic Partnerships

Winter League Cricket partners with leading organizations to bring you the best cricket experience.

## Become a Partner

Interested in partnering with us? We're looking for:

### Retail Partners
Stock our products in your store.

### Coaching Partners
Collaborate on training programs.

### Event Partners
Sponsor and host cricket events.

### Equipment Partners
Supply quality cricket gear.

## Benefits

- Access to our customer base
- Co-marketing opportunities
- Exclusive partner pricing
- Featured placement on our platform

## Apply

Send partnership enquiries to:
**partners@winterleaguecricket.co.za**

Include:
- Company information
- Partnership type of interest
- Proposed collaboration`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 18,
    title: "Affiliate Program",
    slug: "affiliates",
    category: "resources",
    content: `# Affiliate Program

## Earn With Us

Join our affiliate program and earn commission by promoting Winter League Cricket.

## How It Works

1. **Sign Up** - Apply to become an affiliate
2. **Get Links** - Receive unique tracking links
3. **Promote** - Share with your audience
4. **Earn** - Get paid for every sale

## Commission Structure

- **Standard**: 5% per sale
- **Premium Affiliates**: Up to 10%
- **Bulk Referrals**: Custom rates available

## Who Should Apply?

- Cricket bloggers
- Sports influencers
- Coaching academies
- Cricket clubs
- Sports websites

## Requirements

- Active online presence
- Cricket-related audience
- Quality content

## Apply Now

Email **affiliates@winterleaguecricket.co.za** with:
- Your website/social media links
- Audience demographics
- Promotion ideas`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 19,
    title: "Developers",
    slug: "developers",
    category: "resources",
    content: `# Developer Resources

## API Access

*Coming Soon*

We're building APIs for:
- Product catalog
- Order management
- Inventory sync

## Integration Partners

Looking to integrate with Winter League Cricket? Contact us to discuss:
- E-commerce platforms
- Point of sale systems
- Inventory management

## Technical Documentation

Developer documentation will be available soon, including:
- API reference
- Authentication guides
- Code samples
- SDKs

## Beta Access

Want early access to our developer tools? Register your interest:

**developers@winterleaguecricket.co.za**

Include:
- Company/project name
- Intended use case
- Technical requirements`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  },
  {
    id: 20,
    title: "Sustainability",
    slug: "sustainability",
    category: "resources",
    content: `# Sustainability

## Our Commitment

Winter League Cricket is committed to sustainable practices and environmental responsibility.

## Our Initiatives

### 🌍 Eco-Friendly Packaging
- Recyclable materials
- Minimal plastic use
- Biodegradable options

### 🚚 Carbon-Conscious Shipping
- Optimized delivery routes
- Consolidated shipments
- Carbon offset programs

### ♻️ Product Lifecycle
- Durable, long-lasting equipment
- Repair services
- Recycling programs

### 🌱 Community Impact
- Support local cricket clubs
- Youth development programs
- Environmental education

## Goals for 2026

- 100% recyclable packaging
- Carbon-neutral operations
- Zero waste to landfill

## Join Us

Help us make a difference:
- Choose eco-friendly options
- Recycle old equipment
- Support sustainable brands

## Contact

Sustainability enquiries: sustainability@winterleaguecricket.co.za`,
    active: true,
    createdAt: "2025-01-01T00:00:00.000Z"
  }
];

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (error) {
    console.error('Error loading pages data:', error);
  }
  return { pages: defaultPages, idCounter: 21 };
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved pages:', data.pages.length, 'pages');
    return true;
  } catch (error) {
    console.error('Error saving pages data:', error);
    return false;
  }
}

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      const data = loadData();
      const { slug, category, activeOnly } = req.query;
      let pages = data.pages;
      
      if (slug) {
        const page = pages.find(p => p.slug === slug);
        if (page) {
          return res.status(200).json({ success: true, page });
        }
        return res.status(404).json({ success: false, error: 'Page not found' });
      }
      
      if (category) {
        pages = pages.filter(p => p.category === category);
      }
      if (activeOnly === 'true') {
        pages = pages.filter(p => p.active);
      }
      
      return res.status(200).json({ success: true, pages });
    }

    case 'POST': {
      const data = loadData();
      const { title, slug, content, category, active } = req.body;
      
      if (!title || !slug) {
        return res.status(400).json({ success: false, error: 'Title and slug are required' });
      }

      // Check for duplicate slug
      if (data.pages.some(p => p.slug === slug)) {
        return res.status(400).json({ success: false, error: 'A page with this slug already exists' });
      }

      const newPage = {
        id: data.idCounter++,
        title,
        slug,
        content: content || '',
        category: category || 'general',
        active: active !== undefined ? active : true,
        createdAt: new Date().toISOString()
      };

      data.pages.push(newPage);
      
      if (saveData(data)) {
        return res.status(201).json({ success: true, page: newPage, pages: data.pages });
      }
      return res.status(500).json({ success: false, error: 'Failed to save page' });
    }

    case 'PUT': {
      const data = loadData();
      const { id, title, slug, content, category, active } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Page ID is required' });
      }

      const index = data.pages.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Page not found' });
      }

      // Check for duplicate slug (excluding current page)
      if (slug && data.pages.some(p => p.slug === slug && p.id !== parseInt(id))) {
        return res.status(400).json({ success: false, error: 'A page with this slug already exists' });
      }

      data.pages[index] = {
        ...data.pages[index],
        ...(title && { title }),
        ...(slug && { slug }),
        ...(content !== undefined && { content }),
        ...(category && { category }),
        ...(active !== undefined && { active }),
        updatedAt: new Date().toISOString()
      };
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, page: data.pages[index], pages: data.pages });
      }
      return res.status(500).json({ success: false, error: 'Failed to update page' });
    }

    case 'DELETE': {
      const data = loadData();
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Page ID is required' });
      }

      const index = data.pages.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Page not found' });
      }

      data.pages.splice(index, 1);
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, pages: data.pages });
      }
      return res.status(500).json({ success: false, error: 'Failed to delete page' });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}
