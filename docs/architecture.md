# System Architecture

## Overview

Nakanjani Market follows a layered architecture that separates presentation, business logic, authentication, data access, and payment processing into independent components.

The architecture emphasizes:

- Separation of concerns
- Scalability
- Maintainability
- Security
- Reusability

---

## High-Level Architecture

```text
                    Web Browser
                         │
                         ▼
             React + TanStack Start
                         │
        TanStack Router + React Query
                         │
                Server Functions
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
 Authentication    Business Logic      Payments
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                   Supabase Platform
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Authentication   PostgreSQL    Storage
                         │
                         ▼
                    Yoco Payments
```

---

## Frontend Layer

Responsible for:

- User interface
- Routing
- State management
- Product browsing
- Shopping cart
- Vendor dashboards
- Administration

Technologies:

- React
- TypeScript
- TanStack Start
- TanStack Router
- React Query
- Tailwind CSS

---

## Business Logic Layer

Server Functions provide secure execution of business rules.

Responsibilities include:

- Checkout
- Payment initialization
- Order validation
- Inventory validation
- Vendor operations
- Administrative actions

Business logic executes on the server rather than trusting client-side requests.

---

## Authentication Layer

Authentication is handled through Supabase Auth.

Responsibilities:

- Registration
- Login
- Session validation
- JWT verification
- User identity

Authorization is enforced using:

- RBAC
- Ownership validation
- Row Level Security

---

## Database Layer

PostgreSQL stores all marketplace information.

Major entities include:

- Users
- Vendors
- Products
- Categories
- Variants
- Orders
- Payments

Database integrity is maintained using:

- Foreign keys
- Constraints
- SQL functions
- Triggers
- Transactions

---

## Payment Layer

Payments are processed using Yoco Hosted Checkout.

Before payment begins the server:

- Reloads the order
- Reloads catalogue prices
- Validates inventory
- Recalculates totals
- Detects tampering
- Creates payment session

This prevents manipulation of client-side payment values.

---

## Storage Layer

Supabase Storage manages marketplace assets.

Examples include:

- Product images
- Vendor logos
- Uploaded media

---

## Security Model

Security is implemented at multiple layers.

- Authentication
- Authorization
- Row Level Security
- Input validation
- Ownership validation
- Secure payment verification
- Server-side calculations

---

## Scalability

The modular architecture allows independent evolution of:

- Frontend
- Database
- Payments
- Authentication
- Marketplace features

Additional services can be introduced without major architectural changes.