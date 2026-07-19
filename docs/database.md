# Database Design

## Overview

Nakanjani Market uses PostgreSQL through Supabase as its primary relational database.

The database has been designed to support a scalable multi-vendor marketplace while maintaining strong relational integrity, transactional consistency, and secure access control.

Rather than relying solely on application logic, the platform leverages PostgreSQL features such as foreign key constraints, Row Level Security (RLS), SQL functions, triggers, and transactions to enforce business rules.

---

# Design Principles

The database was designed around the following principles:

- Relational integrity
- Vendor isolation
- Secure data access
- Transactional consistency
- Scalable marketplace operations
- Maintainable schema evolution

---

# Core Entities

## Users

Represents authenticated platform users.

Responsibilities include:

- Customer accounts
- Vendor accounts
- Administrator accounts
- Authentication identity

---

## Vendors

Stores marketplace vendors.

Relationships:

- Products
- Orders
- Business profile

Each vendor manages only their own catalogue.

---

## Categories

Provides structured product organisation.

Examples:

- Electronics
- Fashion
- Home
- Beauty
- Automotive

---

## Products

Stores marketplace products.

Each product includes:

- Vendor
- Category
- Description
- Price
- Availability
- Images
- Inventory

---

## Product Variants

Allows products to contain multiple purchasable options.

Examples include:

- Size
- Colour
- Capacity

Each variant maintains independent inventory and pricing.

---

## Orders

Represents completed customer purchases.

Contains:

- Customer
- Vendor relationships
- Payment status
- Fulfilment status
- Totals

---

## Order Items

Each order contains one or more order items.

Stores:

- Product
- Variant
- Quantity
- Unit price
- Total price

Historical pricing is preserved even when catalogue prices change.

---

## Payments

Tracks payment lifecycle.

Typical states include:

- Pending
- Processing
- Paid
- Failed
- Cancelled

Payments are linked directly to orders.

---

# Database Security

Security is enforced using PostgreSQL Row Level Security (RLS).

Policies restrict access based on authenticated users, ownership, and application roles.

Examples include:

- Customers only access their own orders.
- Vendors manage only their own products.
- Administrative access is restricted to privileged users.

---

# Business Logic

Business rules are enforced using:

- SQL functions
- Stored procedures
- Transactions
- Constraints
- Triggers

This reduces application complexity while improving consistency.

---

# Performance

Database performance is improved through:

- Indexed foreign keys
- UUID primary keys
- Optimized joins
- Transactional updates
- Normalized schema

---

# Future Improvements

Potential enhancements include:

- Read replicas
- Partitioning
- Materialized views
- Advanced reporting views
- Full-text search