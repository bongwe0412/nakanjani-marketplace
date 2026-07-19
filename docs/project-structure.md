# Project Structure

## Overview

The project follows a modular architecture that separates presentation, routing, infrastructure, business logic, and shared utilities.

This organization improves maintainability while allowing features to evolve independently.

---

# Root Structure

```
.
├── docs/
├── public/
├── src/
├── supabase/
├── package.json
├── vite.config.ts
└── README.md
```

---

# Source Directory

```
src/
```

Contains the application source code.

---

## components/

Reusable UI components shared across the application.

Examples include:

- Buttons
- Forms
- Layouts
- Product cards
- Navigation
- Dialogs

---

## routes/

TanStack Router route definitions.

Each route represents an application page.

Examples:

- Home
- Product
- Vendor
- Checkout
- Orders
- Administration

---

## hooks/

Reusable React hooks.

Examples:

- Authentication
- Shopping cart
- Product retrieval

---

## integrations/

Third-party integrations.

Examples:

- Supabase
- Authentication
- Database

---

## lib/

Shared application utilities.

Examples:

- Payment helpers
- Validation
- Error handling
- Shared business logic

---

## server/

Server-side functionality.

Responsibilities include:

- Checkout
- Payments
- Business rules
- Secure operations

---

## styles/

Global stylesheets.

---

## types/

Shared TypeScript models.

Provides type safety across the application.

---

## utils/

General helper functions used throughout the project.

---

# Public Directory

Contains static assets.

Examples:

- Icons
- Images
- Manifest
- Robots.txt

---

# Supabase Directory

Contains infrastructure configuration.

Typical contents:

- SQL migrations
- Database functions
- Policies
- Seed data

---

# Documentation

The docs directory contains technical documentation including:

- Architecture
- Database
- API
- Deployment
- Security
- Testing

---

# Design Philosophy

The project follows several architectural principles:

- Separation of concerns
- Modular design
- Reusable components
- Server-side business logic
- Strong typing
- Secure data access

This structure enables the application to scale while remaining maintainable and easy to understand for new contributors.