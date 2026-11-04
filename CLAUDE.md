# Ecommerce Project

Learning project (Codecademy portfolio) built like a real company project.
Backend first, then a frontend (framework not chosen yet), DevOps (CI/CD, Docker, deployment).
it is up to you to show me best practices and ways to create this project as real as possible.

## Working with me
- I am learning. Explain every step in **German**: what you are doing and *why*. Code, comments and commit messages stay in English.
- Introduce real-world industry practices along the way and explain them.
- Ask before big decisions (new libraries, architecture changes, choice of tools).

## Layout
- `Server/` – REST API (Node.js, Express 5, PostgreSQL via `pg`, ES modules)
- `Client/` – SPA (React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui, React Router 8 data mode, TanStack Query, React Hook Form + Zod, Sonner)

## Git workflow
- `main` is protected: no direct pushes. Every change goes through a pull request and needs the CI checks to pass.
- Branch names: `feature/…`, `fix/…`, `docs/…`, `chore/…`. Push the branch, then the user opens/merges the PR on GitHub.
- Commit messages and PR titles: Conventional Commits (`feat(cart): …`, `fix(orders): …`), see `CONTRIBUTING.md`.
- After a merge: `git switch main`, `git pull`, delete the merged branch (local + remote).
- CI: GitHub Actions in `.github/workflows/ci.yml` (Node version from `.nvmrc`): `Server lint` (ESLint + Prettier check) and `Server tests` jobs in `Server/`; the test job has a Postgres service container and runs migrations first. `Client lint` (ESLint, Prettier, `tsc`) and `Client tests` (Vitest + production build) in `Client/`.

## Server commands (run inside `Server/`)
- `npm run dev` – start with nodemon (port from `.env`, default 5000)
- `npm test` – Jest + Supertest; `test:unit` (`tests/unit/`, no DB) / `test:integration` (`tests/integration/`, real DB `ecommerce_db_test` from `.env.test`, tables truncated before each test, helpers in `tests/integration/helpers/`)
- `npm run lint` / `npm run lint:fix` – ESLint (flat config `eslint.config.js`)
- `npm run format` / `npm run format:check` – Prettier (`.prettierrc.json`); CI runs lint + format:check
- `npm run db:migrate` – creates the DB if missing and runs pending migrations (node-pg-migrate, SQL files in `src/db/migrations/`)
- `npm run db:seed` – idempotent sample data (categories, products, admin from `SEED_ADMIN_*`); refuses in production
- `npm run db:rollback` – reverts the last migration; `npm run db:migration:create <name>` – new SQL migration
- Schema changes = new migration file, never edit merged migrations
- API docs: `http://localhost:5000/api/docs` (Swagger)

Setup: local PostgreSQL, copy `.env.example` to `.env`. Never commit `.env`.

## Client commands (run inside `Client/`)
- `npm run dev` – Vite on port 3000 (= `APP_URL`), proxies `/api` to `localhost:5000` (`VITE_API_PROXY_TARGET`)
- `npm test` / `test:watch` / `test:coverage` – Vitest + React Testing Library (jsdom), setup in `src/test/setup.ts`
- `npm run lint`, `npm run typecheck`, `npm run format(:check)`, `npm run build`
- shadcn/ui components: `npx shadcn@latest add <component>` → `src/components/ui/` (our code, may be edited)
- TypeScript pinned to 6.0 until typescript-eslint supports TS 7
- Imports use the `@/` alias for `src/`
- API is always called via the same origin `/api` (auth cookies are `sameSite=strict`), never a different host

## Architecture (Client/src)
- `app/` – `App.tsx` (providers), `routes.tsx` (route objects, shared with tests), `query-client.ts`
- Code splitting: every page except `ShopPage` (landing page) is loaded with the route's `lazy: () => import('@/pages/X').then((m) => ({ Component: m.X }))`; new pages follow this pattern
- `features/<feature>/` – `types.ts` (hand-written API types, snake_case like the API), `api.ts` (calls via `api`), `hooks.ts` (TanStack Query hooks + query keys), `components/`
- `pages/` – one component per route; `components/layout/` – Header, Footer, RootLayout, PageStatus; `components/ui/` – shadcn
- `lib/api-client.ts` – `api.get/post/patch/put/delete`: same-origin `/api`, unwraps `data`, throws `ApiError` (`status`, `message`, `errors`). On 401 it refreshes once and retries; parallel 401s share one refresh (refresh tokens are single use, reuse revokes the session)
- Auth state = query `['auth','me']` (`useCurrentUser`, null = visitor). Any 401 that survives the refresh sets it to null. Ending a session = `endSession()`: set the user to null and remove all other queries (never `queryClient.clear()`: mounted components would keep showing the old user). Leaving on purpose (logout, log out everywhere, delete account) uses `useLeaveSession()`: `navigate('/', { flushSync: true })` first, then `endSession()`; in the other order `RequireAuth` on the old page redirects to `/login?redirect=…` (router updates run in a transition, the query update renders at once). `flushSync` needs `RouterProvider` from `react-router/dom` and a non-lazy target
- Email link pages `/verify-email?token=` and `/reset-password?token=` are public (no guard); verification is sent on a button click, not on page load (mail scanners would use up the single-use token). `VerifyEmailBanner` in the layout for unverified users
- Protected routes: layout route `<RequireAuth />` / `<RequireAuth role="admin" />` → visitors go to `/login?redirect=…` (UX only, the API enforces access)
- Guest-only routes (login, register): layout route `<GuestOnly />` sends logged-in users to `safeRedirect(?redirect)` (only in-app paths, prevents open redirects); it also does the redirect after login
- Forms: React Hook Form + `zodResolver` with client schemas in `features/<feature>/schemas.ts` that mirror the server rules (UX only). `TextField`/`FormAlert` in `components/form/`; `setServerErrors()` (`lib/form-errors.ts`) puts API field errors on inputs, the rest on `root.server`
- Success messages: `toast` from `sonner` (`<Toaster />` in `App.tsx`); errors stay inline in the form
- Shop (`/`, `ShopPage`): filters live in the URL (`?q=&category=<slug>&page=`), parsed/built only via `features/products/shop-params.ts`; the category slug is resolved to `category_id` from the category tree before products load. `formatPrice(cents)` in `lib/format.ts` for all prices. Lists use `placeholderData: keepPreviousData`
- Product page `/products/:slug`; page titles via React 19 `<title>` inside the page component. Cart (`/cart`, behind `RequireAuth`; `useCart()` only runs for logged-in users): every cart endpoint returns the whole cart, mutations write it into the `['cart']` query (`setQueryData`, no optimistic updates); totals always come from the server; checkout is blocked while `getItemProblem()` finds unavailable items or quantities above the stock; visitors adding to the cart are sent to `/login?redirect=<product>`. `QuantityInput` in `components/form/` (clamped to stock)
- Checkout (`/checkout`, one page): `CheckoutForm` with `AddressPicker` (saved addresses as radio group, default preselected, or `NEW_ADDRESS` with `AddressFormFields`); conditional validation in `features/orders/checkout-schema.ts` (`superRefine`). "Save address" creates it first, then orders with `addressId` (and switches the form to it, so a retry does not save it twice). Payment is prepayment by bank transfer: `/checkout/confirmation/:orderNumber` shows `BANK_ACCOUNT` from `lib/shop-config.ts` (demo values) with the order number as reference
- Orders: `/orders` (filters in the URL: `?status=&page=`) and `/orders/:orderNumber`. Customer wording per status in `features/orders/status.ts` (`ORDER_STATUS`); pending orders show `BankTransferDetails` for the outstanding amount (`total - paidCents()`, partial payments are possible). Dates via `formatDate`/`formatDateTime` in `lib/format.ts`
- Side-menu areas use `SideNavLayout` (`components/layout/`): `AccountLayout` and `AdminLayout` only list their sections
- Admin: `/admin/*` under `<RequireAuth role="admin" />` + `AdminLayout` (`pages/admin/`, add new sections there); `/admin` redirects to `/admin/orders`. Admin data uses its own query keys under `['admin', ...]` (`features/admin-<feature>/`). Orders: list `/admin/orders` (`?status=&search=&page=` in the URL, search = order number or customer email) and `/admin/orders/:orderNumber` with `StatusActions` (buttons only for the allowed next steps from `STATUS_ACTIONS` in `features/admin-orders/status.ts`, mirrors the server state machine; "paid" only via payments), `RecordPaymentForm` (prefilled with the outstanding amount, partial payments allowed; amounts parsed with `parseAmountToCents()` from `lib/format.ts`, never with float math) and the history with internal notes
- Admin products: `/admin/products` (`?search=&category=<id>&status=inactive&page=`; the API lists either active or inactive products, never both), `/admin/products/new` and `/admin/products/:productId` with `ProductForm` (`features/admin-products/`). New products start hidden. Stock is only set on create; later changes go through stock movements. An empty slug means generated (new) or unchanged (edit). `ProductForm` mounts only after the category tree is loaded (a `<select>` cannot show a value before its `<option>` exists). Category selects use `flattenCategoryTree()` + `categoryOptionLabel()`
- Never type invisible characters (e.g. non-breaking spaces) literally in source: use `String.fromCharCode(0xa0)`
- Account: `/account/*` under `AccountLayout` (add new sections in `pages/account/AccountLayout.tsx`); `/account` = profile + change password (`features/account/`). `/account/addresses` = address book (`AddressDialog` with `AddressForm` for add/edit, `AddressCard` with set default and delete); every address change reloads the list. `/account/security` = logged-in devices (`SessionList`, names via `describeUserAgent()` in `lib/user-agent.ts`, own small parser), log out one device, `LogoutAllButton`, `DeleteAccountDialog` (password again; 409 = open orders). Profile updates write the returned user into `['auth','me']`
- `AddressFormFields name="..."`: autofill tokens use the name as section only for `shipping`/`billing`
- react-hook-form: use `useWatch`, not `form.watch()` (incompatible with the React Compiler lint rule)
- Tests: `mockApi()` in `src/test/mock-api.ts` stubs fetch per `"METHOD /path"` (a key without `?query` also matches requests with one; an empty cart and an empty shop for `GET /cart`, `GET /categories` and `GET /products` are mocked by default); `renderRoute(path)` in `src/test/render.tsx` mounts the real routes in a memory router; `setup.ts` stubs `ResizeObserver` (missing in jsdom, used by Radix) and sets `asyncUtilTimeout` to 10 s (first render of lazy pages under load); shared builders (`buildOrder`, `buildPayment`, `homeAddress`, ...) in `src/test/fixtures.ts`

## Architecture (Server/src)
Feature modules in `src/modules/<feature>/`, each with the same layers:
`*.routes.js` → `*.controller.js` → `*.service.js` → `*.repository.js` (+ `*.validation.js`)

- **routes**: URL + middleware chain: `authenticate`, `authorize('admin')`, `validateIdParam`, `validate(schema)`
- **controller**: wrapped in `catchAsync`; responds `{ success: true, data }`
- **service**: business logic; throws `new AppError(message, statusCode)`
- **repository**: raw parameterized SQL only (`$1, $2`), never string-concatenate user input
- **validation**: Zod 4 schemas; required fields via `requiredString`/`requiredNumber` from `src/utils/zod.js`, formats via `z.uuid()`/`z.email()`
- New modules must be registered in `src/routes/index.js` and documented in `src/docs/swagger.js`.

Conventions:
- Errors go through `src/middleware/errorHandler.js` → `{ success: false, message, errors? }`. Postgres error codes are mapped there.
- IDs are UUIDs; DB columns are snake_case.
- Auth: short-lived access JWT (cookie `token` or `Authorization: Bearer`, carries session id `sid`; `authenticate` checks the session is active) + rotating single-use refresh token (cookie `refresh_token` on `/api/auth` or body; only its SHA-256 hash is stored, reuse revokes the session). `authorize()` reads the live role from the DB.
- Email links (verification 24 h, password reset 1 h): single-use tokens in `user_tokens` (hash only), sent via `src/mail/` (Nodemailer; locally Mailpit from docker-compose, http://localhost:8025; under Jest collected in `outbox`). Links point to the frontend (`APP_URL`), which posts the token to the API. Checkout requires `email_verified_at` (`requireVerifiedEmail`). `createUser()` in tests verifies by default.
- Security: CORS only for `CORS_ORIGINS` (default `APP_URL`). Rate limiting per IP in `src/middleware/rateLimit.js` (`apiLimiter` on `/api`, strict `authLimiter` on login/register/email-link routes; off in `.env.test`). Behind a proxy set `TRUST_PROXY`.
- Multi-step writes (register, checkout) use a transaction: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`.
- Products are soft-deleted (`is_active = false`).
- Orders for admins (`GET /orders/all`, `GET /orders/:id`) include `customer` (`orderRepository.findCustomer`, also for anonymized users: `userRepository.findById` skips deleted users).
- Users (GDPR): really deleted without orders/audit rows, otherwise anonymized (`deleted_at`, fake email, CHECK `chk_users_deleted_anonymized`); `userRepository.findById`/`findByEmail` never return deleted users.
