# Launch Readiness Checklist

Track environment readiness, security, commerce, inventory, and operations sign-off before launching the marketplace.

## Infrastructure

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Yoco keys configured | ☐ | | Live keys in backend secrets; test mode disabled |
| Webhook registered | ☐ | | `POST /api/public/yoco-webhook` registered in Yoco dashboard |
| Webhook secret configured | ☐ | | `YOCO_WEBHOOK_SECRET` set and verified |
| Reconciliation cron active | ☐ | | `reconcile-pending-payments` runs every 5 minutes |
| Reservation expiry cron active | ☐ | | `expire-old-reservations` runs every 5 minutes |

## Security

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| RLS audit complete | ☐ | | All public tables have policies and GRANTs |
| Admin role verified | ☐ | | At least one user has `admin` role in `public.user_roles` |
| Vendor permissions verified | ☐ | | Vendor can manage only own products, orders, and media |
| Customer permissions verified | ☐ | | Customer can view only own cart, orders, and payments |
| Storage audit complete | ☐ | | All buckets private, policies scoped to owner folders |

## Commerce

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Product creation verified | ☐ | | Vendor can create a product with images |
| Variants verified | ☐ | | Variants create, update, and stock tracked correctly |
| Cart verified | ☐ | | Guest and authenticated cart merge correctly |
| Checkout verified | ☐ | | Checkout creates a pending order and payment |
| Yoco payment success verified | ☐ | | Webhook/redirect marks order paid and deducts inventory |
| Yoco payment failure verified | ☐ | | Failure releases reservation and notifies customer |
| Yoco cancellation verified | ☐ | | Cancellation returns stock and cancels order |
| Reconciliation verified | ☐ | | Stuck processing payments resolve automatically |

## Inventory

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Reservation creation verified | ☐ | | Checkout reserves stock for cart items |
| Reservation expiry verified | ☐ | | Expired reservations release stock automatically |
| Inventory deduction verified | ☐ | | Successful payment deducts from variant stock |
| Inventory release verified | ☐ | | Failed/cancelled payment releases reservation |
| Oversell protection verified | ☐ | | Cannot purchase more than available stock |

## Operations

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Admin dashboard verified | ☐ | | Admin can view orders, payments, vendors, and KPIs |
| Health dashboard verified | ☐ | | Admin can see cron status, stuck payments, and reservation backlog |
| Payment sync verified | ☐ | | Manual Yoco sync works on stuck payments |
| Vendor approval workflow verified | ☐ | | Admin can approve or suspend vendor accounts |

## UAT Sign-off

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Authentication tests passed | ☐ | | Sign-up, sign-in, password reset, role-based access |
| Vendor tests passed | ☐ | | Onboarding, product creation, order management |
| Product tests passed | ☐ | | Listing, variants, search, images |
| Checkout tests passed | ☐ | | Cart, checkout, shipping/tax, order confirmation |
| Payment tests passed | ☐ | | Success, failure, cancellation, reconciliation |
| Admin tests passed | ☐ | | Dashboard, health, sync, vendor approval |

## Go-Live Approval

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Ready for closed beta | ☐ | | Core flows tested with a small group of real vendors and customers |
| Ready for public launch | ☐ | | Closed beta completed, no critical issues, monitoring in place |

---

**Sign-off:** _________________________ **Date:** ________________

**Final status:** ☐ Closed beta approved ☐ Public launch approved
