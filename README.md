# 🛒 Nakanjani Market

> **A cloud-native multi-vendor eCommerce marketplace built for South Africa.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-Latest-FF4154)
![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python)
![AWS](https://img.shields.io/badge/AWS-Cloud-FF9900?logo=amazonaws)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql)
![MIT License](https://img.shields.io/badge/License-MIT-success)

---

## 📖 Overview

Nakanjani Market is a modern cloud-native multi-vendor eCommerce platform designed to empower South African businesses to sell online through a secure, scalable, and feature-rich digital marketplace.

Unlike traditional online stores that support only a single merchant, Nakanjani Market enables multiple independent vendors to operate within one marketplace while maintaining separate catalogues, inventory, order management workflows, and business profiles.

The platform combines modern frontend technologies with cloud-native backend services to deliver a responsive shopping experience, secure payment processing, scalable infrastructure, and production-ready engineering practices.

Customers can browse products across multiple categories, securely complete purchases through Yoco, manage their orders, and interact with trusted South African businesses from a single platform.

For vendors, the marketplace provides tools to manage products, monitor inventory, process orders, and grow their businesses without investing in custom eCommerce infrastructure.

Administrators have access to centralized management capabilities including vendor approval, catalogue moderation, order oversight, customer management, and operational reporting.

The project demonstrates modern full-stack software engineering using React, TypeScript, TanStack Start, Python, PostgreSQL, AWS cloud services, and Supabase.

---

## 🎯 Why This Project Exists

South Africa has thousands of small and medium-sized businesses that struggle to establish an affordable online presence. Existing marketplace solutions are often expensive, difficult to customize, or primarily focused on international markets.

Nakanjani Market was designed to provide a modern, locally focused marketplace capable of supporting South African merchants through a scalable cloud-native architecture.

The platform emphasizes:

- Vendor independence
- Secure payment processing
- Scalable cloud infrastructure
- Modern user experience
- Strong security practices
- Maintainable software architecture
- Production-ready deployment
- Extensible modular design

Beyond solving a business problem, this project serves as a demonstration of enterprise software engineering practices including cloud architecture, API design, authentication, payment integration, database modelling, and secure backend development.

---

---

# ✨ Key Features

Nakanjani Market provides a comprehensive set of features for customers, vendors, and marketplace administrators while maintaining a scalable cloud-native architecture.

## 🛍️ Customer Features

Customers can enjoy a modern online shopping experience designed around speed, security, and simplicity.

### Shopping Experience

- Browse products across multiple categories
- Advanced product search
- Product filtering
- Responsive mobile-first interface
- Product image galleries
- Detailed product information
- Product variants (size, colour, etc.)
- Wishlist management
- Shopping cart
- Secure checkout
- Order history
- Order tracking
- Customer account management

### Payments

- Secure Yoco payment integration
- Hosted payment checkout
- Payment verification
- Payment status tracking
- Payment cancellation support
- Fraud protection

---

## 🏪 Vendor Features

Each vendor operates independently while sharing the same marketplace infrastructure.

### Vendor Dashboard

- Vendor registration
- Vendor business profile
- Product management
- Product image uploads
- Product variants
- Inventory management
- Stock availability
- Category management
- Order management
- Sales tracking
- Customer order fulfilment

### Catalogue Management

- Unlimited products
- Product categories
- Product descriptions
- Product pricing
- Product status management
- Featured products
- Inventory synchronization

---

## 👨‍💼 Administrator Features

Marketplace administrators have centralized management capabilities.

### Marketplace Administration

- Vendor approval
- Vendor management
- Product moderation
- Category management
- User management
- Customer management
- Marketplace monitoring
- Order oversight
- Payment monitoring
- Marketplace configuration

---

# 🏗️ System Architecture

Nakanjani Market follows a modern cloud-native architecture that separates responsibilities across independent layers.

```
                React + TanStack Start
                         │
                         ▼
              Server Functions / API Layer
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
     Authentication   Business Logic   Payments
         │               │               │
         ▼               ▼               ▼
     Supabase Auth    Python Services    Yoco API
         │               │
         └───────────────┼───────────────┘
                         ▼
                  PostgreSQL Database
                         │
                         ▼
                 Storage / File Uploads
```

The architecture emphasizes:

- Separation of concerns
- Modular services
- Secure authentication
- Stateless APIs
- Server-side validation
- Scalable infrastructure
- Cloud-native deployment
- Maintainable codebase

Each major feature is implemented as an independent module, making the platform easier to extend and maintain as additional marketplace functionality is introduced.

---

# 🚀 Technology Stack

## Frontend

- React 18
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Vite

## Backend

- Python
- TypeScript
- Server Functions
- Supabase
- PostgreSQL

## Cloud Infrastructure

- Amazon Web Services (AWS)
- EC2
- API Gateway
- Lambda
- Amazon S3
- IAM
- CloudWatch

## Payments

- Yoco Payments API

## Authentication

- Supabase Authentication
- JWT
- Role-Based Access Control (RBAC)

## Development Tools

- Git
- GitHub
- ESLint
- Playwright
- Vitest
- npm

---

---

# ☁️ Platform Architecture

Nakanjani Market follows a modern full-stack architecture built around a React frontend, TanStack Start server functions, Supabase services, PostgreSQL, and Yoco payment processing.

The application separates presentation, business logic, authentication, and data persistence into clearly defined layers to improve maintainability and scalability.

```text
                 Web Browser
                      │
                      ▼
          React + TanStack Start
                      │
          TanStack Router + Query
                      │
             Server Functions
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
 Authentication   Business Logic   Payments
      │               │               │
      └───────────────┼───────────────┘
                      ▼
                Supabase Platform
         (Auth • PostgreSQL • Storage)
                      │
                      ▼
                Yoco Payments API
```

The architecture provides:

- Component-based frontend architecture
- Server-side business logic
- Secure authentication
- Role-based authorization
- Relational PostgreSQL database
- Secure payment processing
- Scalable backend services

---

# 🛠️ Technology Stack

## Frontend

- React 18
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS
- Vite

## Backend

- TanStack Start Server Functions
- Supabase
- PostgreSQL

## Authentication

- Supabase Authentication
- JWT-based sessions
- Role-Based Access Control (RBAC)

## Database

- PostgreSQL
- Row Level Security (RLS)
- SQL Functions
- SQL Triggers
- Database Views

## Storage

- Supabase Storage

## Payments

- Yoco Payments API

## Development

- Git
- GitHub
- npm
- ESLint
- Playwright
- Vitest

---

---

# 🛒 Marketplace Architecture

Nakanjani Market is designed as a true multi-vendor marketplace where multiple independent businesses operate within a single platform while maintaining ownership of their own catalogues, inventory, and orders.

Unlike traditional eCommerce platforms that support only a single merchant, Nakanjani Market provides the infrastructure required for multiple vendors to coexist while delivering a seamless shopping experience for customers.

## Marketplace Components

### Vendors

Each registered vendor manages their own business through an isolated dashboard.

Vendor capabilities include:

- Business profile management
- Product catalogue management
- Inventory management
- Product variants
- Pricing management
- Order fulfilment
- Sales monitoring

Each vendor only has access to their own operational data, while administrators retain marketplace-wide visibility.

---

### Products

Products are organized into structured categories and support rich catalogue information.

Each product contains:

- Product name
- Description
- Images
- Category
- Vendor
- Pricing
- Availability status
- Inventory
- Product variants

The architecture allows products to remain independent while still participating in marketplace-wide search and discovery.

---

### Product Variants

Products may contain multiple purchasable variations.

Examples include:

- Size
- Colour
- Capacity
- Weight
- Packaging options

Each variant can maintain its own:

- Price
- Inventory
- SKU
- Availability

This allows vendors to manage complex product catalogues without duplicating products.

---

### Shopping Cart

Customers can build shopping carts containing products from multiple vendors.

The checkout process validates:

- Product availability
- Variant availability
- Current pricing
- Inventory
- Order totals

This validation occurs on the server before payment is initiated.

---

### Orders

Orders are created after successful checkout and represent the authoritative purchase record.

Order information includes:

- Customer information
- Purchased items
- Vendor relationships
- Order totals
- Payment status
- Fulfilment status
- Timestamps

Order totals are recalculated server-side before payment processing to prevent client-side manipulation.

---

### Payments

Payments are processed securely using the Yoco Hosted Checkout platform.

The application never trusts payment amounts submitted by the client.

Instead, the server:

- Reloads the order
- Reloads every ordered product
- Reloads every selected variant
- Recalculates totals
- Detects tampering
- Updates incorrect totals
- Initiates payment only after validation

This approach significantly reduces the risk of payment manipulation.

---

# 🗄️ Database Design

Nakanjani Market is backed by PostgreSQL using Supabase as the managed platform.

The database is designed around relational integrity, security, and scalability.

Rather than relying solely on application logic, many business rules are enforced directly within the database through constraints, functions, triggers, and Row Level Security (RLS) policies.

## Core Entities

The platform is built around several primary entities.

### Users

Authenticated users of the platform.

Responsible for:

- Authentication
- Profiles
- Roles
- Customer accounts
- Vendor accounts
- Administrative access

---

### Vendors

Represents businesses operating within the marketplace.

Relationships include:

- Products
- Orders
- Business information

---

### Products

Stores marketplace catalogue information.

Relationships:

- Categories
- Vendors
- Variants
- Images
- Inventory

---

### Product Variants

Stores purchasable variations for products.

Examples include:

- Size
- Colour
- Capacity

Each variant maintains independent pricing and inventory.

---

### Orders

Represents completed customer purchases.

Orders maintain relationships with:

- Customers
- Vendors
- Order items
- Payments

---

### Order Items

Each order contains one or more order items.

Each item records:

- Purchased product
- Selected variant
- Quantity
- Unit price
- Line total

This preserves historical purchase accuracy even when catalogue prices change later.

---

### Payments

Tracks payment transactions throughout their lifecycle.

Payment states include:

- Pending
- Processing
- Paid
- Failed
- Cancelled

Payment records are linked directly to their corresponding orders to simplify reconciliation.

---

### Categories

Organizes products into logical groups for browsing and search.

Categories support future expansion into nested hierarchies if required.

---

## Database Features

The database implementation includes several production-oriented features.

- PostgreSQL relational design
- Foreign key constraints
- SQL functions
- Stored procedures
- Database triggers
- Row Level Security (RLS)
- UUID primary keys
- Audit timestamps
- Transactional updates
- Referential integrity
- Payment consistency checks

By enforcing critical business rules at the database level, the platform maintains consistency even when multiple services interact with the same data.

---

---

# 🔐 Authentication & Authorization

Nakanjani Market implements a secure authentication and authorization model using Supabase Authentication, JWT-based sessions, and Role-Based Access Control (RBAC).

The platform is designed to ensure that every authenticated user only has access to the resources they are permitted to view or modify.

## Authentication

User authentication is handled through Supabase Auth, providing secure identity management without exposing sensitive authentication logic to the client application.

The authentication system provides:

- Secure user registration
- User sign in
- Persistent authenticated sessions
- Session refresh
- Password recovery
- Protected server-side endpoints
- Secure logout

Authenticated requests automatically include the user's identity, allowing server-side functions to verify ownership before performing any operation.

---

## Role-Based Access Control (RBAC)

Different users have different responsibilities within the marketplace.

Authorization is enforced using application roles together with database-level security policies.

Typical roles include:

- Customer
- Vendor
- Administrator

Each role receives only the permissions required for its responsibilities.

Examples include:

### Customers

Customers can:

- Browse products
- Manage their profile
- Maintain a shopping cart
- Place orders
- View their own order history
- Manage their own payments

Customers cannot:

- Access vendor dashboards
- Modify marketplace products
- View other customers' orders
- Perform administrative operations

---

### Vendors

Vendors can:

- Manage their own products
- Manage inventory
- Process customer orders
- Update business information
- View their own sales

Vendors cannot:

- Modify another vendor's catalogue
- Access marketplace administration
- View another vendor's business data

---

### Administrators

Administrators have elevated permissions to manage the overall marketplace.

Administrative capabilities include:

- Vendor management
- Marketplace moderation
- Category management
- User management
- Platform configuration
- Marketplace monitoring

Administrative functionality is protected through additional authorization checks before privileged operations are executed.

---

## Server-Side Authorization

Sensitive operations are never trusted to the client.

Before executing protected actions, the server validates:

- User identity
- User role
- Resource ownership
- Required permissions

Examples include:

- Payment creation
- Payment cancellation
- Order management
- Product management
- Administrative operations

This approach ensures that malicious users cannot bypass frontend restrictions by sending modified requests.

---

## Database-Level Security

Authorization is reinforced using PostgreSQL Row Level Security (RLS).

Rather than relying solely on frontend or server-side checks, access policies are enforced directly within the database.

This provides an additional security layer that protects data regardless of where database requests originate.

---

# 🛡️ Security

Security has been considered throughout the platform architecture, from authentication and payment processing to database access and server-side validation.

The application follows a defence-in-depth approach where multiple layers work together to protect marketplace data.

---

## Secure Payment Processing

Payments are processed using Yoco Hosted Checkout.

Before a payment session is created, the server independently validates the order by:

- Reloading the order from the database
- Loading every purchased product
- Loading selected product variants
- Recalculating pricing
- Validating inventory
- Confirming product availability

The payment amount is calculated exclusively on the server.

Client-provided totals are never trusted.

If inconsistencies are detected, the stored order values are corrected before payment processing continues.

This significantly reduces the risk of payment manipulation.

---

## Input Validation

Incoming requests are validated before business logic is executed.

Validation includes:

- Required fields
- UUID validation
- Data type validation
- Request structure validation

Malformed requests are rejected before reaching protected application logic.

---

## Ownership Verification

The platform validates ownership before allowing users to access or modify protected resources.

Examples include:

- Orders
- Payments
- Vendor resources
- Customer information

Users cannot access records belonging to another account.

---

## Database Integrity

Critical business rules are enforced through PostgreSQL.

Examples include:

- Foreign key constraints
- Referential integrity
- Transactional updates
- Stored procedures
- Database functions
- Row Level Security
- Consistent payment state management

Moving important validation into the database helps ensure consistent behaviour across the application.

---

## Session Security

Authenticated sessions are managed through secure JWT-based authentication.

Protected server endpoints validate authenticated users before executing business logic.

Unauthenticated requests cannot access protected marketplace functionality.

---

## Error Handling

Server-side operations use structured error handling to avoid exposing sensitive implementation details.

Unexpected failures are handled gracefully while protecting internal infrastructure information from end users.

---

## Security Principles

The platform follows several security best practices throughout the application:

- Principle of least privilege
- Server-side validation
- Secure authentication
- Authorization before execution
- Database-level access control
- Strong relational integrity
- Payment verification
- Ownership validation
- Defence in depth

These practices contribute to a secure and maintainable marketplace capable of supporting production workloads.

---

---

# 📚 API Overview

Nakanjani Market exposes server-side functionality through TanStack Start Server Functions, providing a clean separation between the client application and business logic.

Rather than exposing direct database access from the frontend, all sensitive operations are performed through validated server endpoints.

## Core Functional Areas

### Authentication

Responsible for:

- User registration
- User authentication
- Session validation
- Logout
- Protected route access

---

### Products

Provides functionality for:

- Product retrieval
- Product search
- Category filtering
- Product variants
- Product management
- Inventory updates

---

### Vendors

Supports:

- Vendor profile management
- Vendor product management
- Vendor order processing
- Marketplace participation

---

### Orders

Responsible for:

- Cart checkout
- Order creation
- Order retrieval
- Order history
- Order status updates

---

### Payments

Payment services include:

- Checkout initialization
- Payment verification
- Payment cancellation
- Webhook processing
- Payment reconciliation

---

### Administration

Administrative functionality includes:

- Vendor management
- Product moderation
- Marketplace administration
- User management

---

# 📂 Project Structure

```
src/
├── components/          Reusable UI components
├── routes/              TanStack Router routes
├── hooks/               Custom React hooks
├── integrations/        Supabase integration
├── lib/                 Shared utilities
├── server/              Server-side functionality
├── styles/              Global styling
├── types/               Shared TypeScript types
├── utils/               Helper utilities
└── main.tsx             Application entry point

public/
    Static assets

supabase/
├── migrations/
├── functions/
└── configuration

docs/
    Technical documentation
```

The project follows a modular architecture that separates presentation, business logic, infrastructure, and data access.

This structure makes the codebase easier to maintain, extend, and test.

---

# ⚙️ Local Development

## Prerequisites

Before running the application locally ensure you have:

- Node.js 20+
- npm
- Git
- Supabase project
- Yoco developer account (optional for payment testing)

---

## Clone the repository

```bash
git clone https://github.com/<username>/nakanjani-market.git

cd nakanjani-market
```

---

## Install dependencies

```bash
npm install
```

---

## Configure environment variables

Create a `.env.local` file.

Example:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

YOCO_SECRET_KEY=

YOCO_WEBHOOK_SECRET=
```

---

## Run the application

```bash
npm run dev
```

---

## Production Build

```bash
npm run build
```

---

## Preview Production Build

```bash
npm run preview
```

---

# 🧪 Testing

The project includes automated testing support for validating functionality throughout development.

Testing technologies include:

- Playwright
- Vitest

Testing focuses on:

- User authentication
- Shopping experience
- Product management
- Payment workflow
- Marketplace functionality

Future improvements include:

- Integration testing
- End-to-end payment simulation
- Performance testing
- Security testing
- Load testing

---

# 🚀 Deployment

The application is designed for cloud deployment.

Deployment considerations include:

- Environment variable management
- Secure secrets management
- HTTPS
- Production database
- Payment webhook configuration
- Asset optimization

Deployment checklist:

- Configure Supabase
- Configure Yoco
- Configure production domain
- Configure environment variables
- Build application
- Deploy application
- Verify payment flow
- Verify authentication
- Verify storage
- Verify database connectivity

---

# 🚧 Engineering Challenges Solved

Nakanjani Market demonstrates solutions to several real-world engineering problems.

### Multi-vendor Architecture

Supporting multiple independent businesses while maintaining data isolation.

---

### Secure Payments

Preventing payment manipulation by recalculating order totals server-side before initiating payment.

---

### Inventory Consistency

Ensuring stock remains synchronized during checkout.

---

### Authorization

Protecting vendor and customer resources using server-side authorization and Row Level Security.

---

### Database Integrity

Maintaining relational consistency through PostgreSQL constraints, triggers, stored procedures, and transactional updates.

---

### Maintainability

Keeping business logic modular through reusable components, shared utilities, and clearly separated responsibilities.

---

# 📈 Roadmap

Future enhancements include:

## Marketplace

- Product reviews
- Ratings
- Coupons
- Flash sales
- Gift cards
- Loyalty programme

---

## Vendor Features

- Vendor analytics
- Sales dashboards
- Promotional campaigns
- Bulk product imports
- Shipping integrations

---

## Customer Experience

- Saved addresses
- Order tracking improvements
- Product recommendations
- Recently viewed products
- Personalised shopping

---

## Platform

- Email notifications
- SMS notifications
- Push notifications
- Advanced reporting
- Marketplace analytics

---

# 🤝 Contributing

Contributions are welcome.

If you would like to improve the project:

1. Fork the repository

2. Create a feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push the branch

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

Please ensure new code:

- follows the existing coding standards
- is documented
- is tested where applicable
- does not introduce breaking changes

---

# 📄 License

This project is licensed under the MIT License.

See the LICENSE file for details.

---

# 👨‍💻 Author

## Sibongakonke Mthethwa

Founder — **Vertex Labz**

Software Engineer • Full-Stack Developer • Cloud Solutions Developer

### Technologies

- React
- TypeScript
- PostgreSQL
- Supabase
- TanStack Start
- JavaScript
- Tailwind CSS
- Yoco Integration

---

## Contact

GitHub

https://github.com/sbonga-mthethwa

LinkedIn

https://linkedin.com/in/sibongakonke-mthethwa

Website

https://vertexlabz.co.za

Marketplace

https://nakanjani.co.za

---

⭐ If you found this project useful, consider starring the repository.