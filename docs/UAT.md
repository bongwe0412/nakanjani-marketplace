# NAKANJANI — User Acceptance Testing (UAT)

Pre-launch checklist for real-money readiness. Run each scenario end-to-end on the **published URL** with a real browser. Use a Yoco test card for payment scenarios; Yoco issues a sandbox key in the dashboard.

## 0. Environment & secrets

- [ ] `YOCO_SECRET_KEY` is the live key (or test key if rehearsing).
- [ ] `YOCO_WEBHOOK_SECRET` matches the webhook registered against the production URL `https://nakanjani.co.za/api/public/yoco-webhook`.
- [ ] Custom domain (if any) points to the published URL and SSL is green.
- [ ] `/admin/health` is reachable and `release-expired-reservations` + `reconcile-pending-payments` jobs are listed and `active = yes`.

## 1. Auth

- [ ] Sign up with email + password (new address). Receive confirmation email.
- [ ] Confirm email, sign in, land on home.
- [ ] Sign out, sign back in.
- [ ] Forgot password → email → `/reset-password` flow sets a new password.
- [ ] Sign in with Google (OAuth) — first time and returning.
- [ ] Unauthenticated visit to `/orders`, `/wishlist`, `/vendor/dashboard`, `/admin` all redirect to `/auth`.

## 2. Browse & search

- [ ] Home loads, hero + featured products render.
- [ ] Product images load (signed URLs valid, no broken images).
- [ ] Category page lists products; subcategory filters.
- [ ] Vendor profile page (`/vendor/$slug`) shows store + products.
- [ ] Search returns relevant results; empty state on bad query.
- [ ] Product detail page increments view count.

## 3. Cart & inventory

- [ ] Add an in-stock product to cart. Quantity respects available stock.
- [ ] Try to add more than `available_stock` — blocked with a clear message.
- [ ] Open the same product in a 2nd browser; add to cart from both; only one can checkout the last unit (reservation wins).
- [ ] Cart persists across sign-in.
- [ ] Remove items / update quantities.

## 4. Checkout

- [ ] Filling delivery details validates required fields.
- [ ] **Submit is blocked until the Terms / Privacy / Returns checkbox is ticked.**
- [ ] Order is created with `payment_status = unpaid`, `terms_accepted_at` populated.
- [ ] Inventory reservation is created (visible by stock change in another tab).
- [ ] Redirects to Yoco hosted checkout.

## 5. Payment — Yoco

### Success path
- [ ] Pay with test card → returned to `/payment/success`.
- [ ] Webhook fires (`payment.succeeded`) — check `/admin/orders/$id` timeline.
- [ ] Order moves to `processing`, `payment_status = paid`.
- [ ] `vendor_orders` row(s) created with status `processing`.
- [ ] Inventory committed (stock decremented, reservation gone).

### Cancel path
- [ ] Cancel on Yoco → `/payment/cancelled`. Order stays cancellable.
- [ ] Reservation released within 30 min (or earlier if user retries another payment that supersedes).

### Failure path
- [ ] Trigger a failed card → `/payment/failed`. Status `failed`, reservation released, vendor splits cancelled.

### Reconciliation
- [ ] Simulate missed webhook: pay successfully but block the webhook (e.g. temporarily disable it in Yoco). After 10 min `/admin/health` flags the stuck payment; within 5 more minutes the reconciliation cron runs and the payment flips to `successful` automatically.
- [ ] Manual `Sync` button on `/admin/payments` does the same on demand.

### Idempotency
- [ ] Re-deliver the same Yoco webhook event from Yoco's dashboard — server returns 200, no double-commit (timeline shows event only once).

## 6. Vendor onboarding & ops

- [ ] Apply as vendor via `/vendor/apply`. Application appears in `/admin/vendors` as `pending`.
- [ ] Admin Approves → vendor sees their dashboard, can create products.
- [ ] Create a product with images. Upload only writes under `<vendor-uid>/...` in `product-images` bucket (verified via Network tab).
- [ ] Vendor cannot read or modify another vendor's products.
- [ ] Vendor sees their share in `/vendor/orders` after a customer's order is paid.

## 7. Admin

- [ ] `/admin` overview KPIs match `/admin/orders` and `/admin/payments` totals.
- [ ] Orders list filters (status, payment, search) work.
- [ ] Order detail page shows items, payments, vendor splits, full timeline, addresses.
- [ ] Vendor verify/suspend/reset flows update status immediately.
- [ ] Categories CRUD works (`/admin/categories`).
- [ ] Health page: `pg_cron` jobs listed, recent runs show `succeeded`.

## 8. Security spot checks

- [ ] Open browser devtools → Network on every flow. Confirm `YOCO_SECRET_KEY` is never returned to the browser.
- [ ] As a signed-in non-admin, hitting `/admin` shows "Admin access required", not data.
- [ ] Direct `POST` to `/api/public/cron/reconcile-payments` without the `apikey` header returns 401.
- [ ] Direct `POST` to `/api/public/yoco-webhook` with a bad signature returns 401.
- [ ] Vendor PII fields (`email`, `phone`, `whatsapp`) are not exposed via the public vendors listing.

## 9. Performance / SEO sanity

- [ ] Lighthouse on home and a product page ≥ 80 Performance.
- [ ] `/sitemap.xml` resolves and includes top-level pages.
- [ ] `<title>` and `<meta description>` are unique per route.
- [ ] OG previews (Slack / WhatsApp link unfurl) render correctly on a product page.

## 10. Cleanup before launch

- [ ] Remove or anonymise any test orders, vendors, products created during UAT.
- [ ] Rotate `YOCO_SECRET_KEY` if test/live keys were swapped.
- [ ] Confirm `pg_cron` jobs survive a deploy (still listed in `/admin/health`).
- [ ] Document on-call contact and escalation path for failed webhooks.

---

**Sign-off:** record tester name + date when every box above is ticked.