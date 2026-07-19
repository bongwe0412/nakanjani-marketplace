# Deployment Guide

## Overview

Nakanjani Market is designed for production deployment using modern cloud infrastructure.

The application separates frontend assets, server-side logic, authentication, storage, and the relational database.

---

# Deployment Checklist

Before deploying:

- Configure Supabase
- Configure Storage
- Configure Authentication
- Configure Production Domain
- Configure Yoco
- Configure Environment Variables

---

# Environment Variables

Example:

```env
VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=

YOCO_SECRET_KEY=

YOCO_WEBHOOK_SECRET=
```

---

# Build

Install dependencies.

```bash
npm install
```

Build production assets.

```bash
npm run build
```

Preview production build.

```bash
npm run preview
```

---

# Production Considerations

Recommended production practices:

- HTTPS
- Secure secrets
- Production database
- Monitoring
- Error logging
- Automated backups

---

# Payment Configuration

Configure:

- Yoco Secret Key
- Webhook Secret
- Production callback URLs

Verify payment flow before launch.

---

# Database

Apply all migrations before deployment.

Confirm:

- RLS policies
- Functions
- Triggers
- Constraints

---

# Verification

After deployment verify:

- Authentication
- Product browsing
- Vendor dashboard
- Checkout
- Payments
- Image uploads
- Order creation

---

# Monitoring

Recommended monitoring includes:

- Application errors
- Database health
- Storage usage
- Payment failures
- Authentication failures

---

# Disaster Recovery

Recommended practices:

- Regular backups
- Version-controlled migrations
- Environment variable backups
- Database restore testing