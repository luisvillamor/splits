# splits.

Collaborative expense splitting for friend groups.

Six friends go out for dinner. Someone pays. Then the group chat fills up with “wait, who ordered the pizza?” Splits turns that into one shared session: everyone adds their own orders, shared plates are assigned, the receipt stays visible, and the app calculates exactly who owes what — and why.

## Features

- Email/password accounts, with optional Google sign-in
- Permanent groups (the friend circle) and Split sessions (the night out)
- Invite codes and links
- Individual and equally shared expenses, with an **Everyone** shortcut
- Live collaboration on an open Split
- Receipt upload and total matching
- Tax, service charge, and other fees split equally
- Multiple restaurant payers and minimized settlement transfers
- Payment tracking with a GCash-ready provider interface (GCash itself is not faked)
- Activity history for money-related changes
- Mobile-first Split screen, responsive on tablets and laptops

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 16 (App Router) + TypeScript | Server actions, protected routes, one deployable app |
| UI | Tailwind CSS 4 + Outfit | Matches the red/white reference design without extra UI kits |
| Auth / DB / Realtime / Storage | Supabase | Postgres for money, RLS for permissions, Realtime for collaboration, Storage for receipts |
| Tests | Vitest | Calculation and settlement engines stay independently testable |

Supabase is the backend because the product is both **relational** (bills, members, settlements) and **live** (everyone at the table watching the same bill). A document store or fake polling would fight those requirements.

## Architecture

```
src/
  app/                 routes (landing, auth, dashboard, groups, splits)
  actions/             server mutations + authorization
  components/          UI, brand, split workspace
  lib/
    money.ts           integer centavos only
    calc/              bill calculation engine
    settlement/        who-owes-whom engine
    payments/          provider interface (manual now, GCash later)
    supabase/          browser, server, session proxy
  types/               domain types
```

**Presentation** never computes a bill. Screens call `calculateSplit` / `settleBalances`.

**Authorization** is enforced twice: Supabase Row Level Security, then server actions. Changing an expense id in a request cannot edit someone else’s order.

**Realtime** uses Supabase `postgres_changes`. On any change, clients refetch the Split bundle. Concurrent edits use **last-write-wins**. If you save an expense that was just deleted, you get a clear error instead of a silent overwrite.

**Review** is a screen, not a stored status. A Split is `open` or `finalized`. After finalize, expenses, fees, participants, and calculations are locked. Payment status can still change.

### Money

All amounts are **integer centavos** (`BIGINT` in Postgres, integers in JS). Pesos are only a display format.

Equal splits use the largest-remainder method: leftover centavos are given out one-by-one in sorted user-id order so shares always sum to the original amount.

The UI may show a **suggested payment** rounded to the nearest peso. Settlement always uses the exact amount. Suggested values are never stored as the source of truth.

### “Everyone” and membership

**Everyone** snapshots the current Split participants at save time. It is not a live pointer.

Split participants are copied from the group when the Split is created. Friends who join the group later do not silently appear on an existing bill (that would rewrite other people’s shares). New Splits include whoever is in the group at creation time.

### Payments and GCash

Who paid the **restaurant** (`bill_contributions`) is separate from who pays **friends back** (`settlement_transfers`).

`src/lib/payments/provider.ts` is the integration point. MVP uses `ManualPaymentProvider`. `GCashPaymentProvider` exists but is disabled. A future GCash checkout should confirm through that interface, then mark the same settlement row `paid`.

Finalize requires recorded restaurant payments to equal the Split total. The creator is not assumed to have paid.

### Receipts

The creator uploads an image and a receipt total. Everyone can view it. If the receipt total and Split total differ, finalize is blocked until they match. That is intentional: the receipt is the transparency check, not decoration.

## Database setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/20260906120000_init.sql`.
3. Authentication → Providers:
   - Email: enabled. For local demos, you can disable “Confirm email”.
   - Google: optional. If you enable it, also set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
4. Copy **Project URL** and **anon public** key into `.env.local`.

The migration creates tables, indexes, RLS, Realtime publication, and private `receipts` / public `avatars` storage buckets.

If you use the Supabase CLI:

```bash
supabase db push
```

## Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
```

Never commit `.env.local`. The service role key is not required to run the app and must never be exposed to the browser.

## Local development

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test
```

The calculation engine covers:

1. Individual expenses
2. Shared expenses
3. Individual + shared
4. Equal fees
5. Multiple restaurant payers
6. Rounding that does not corrupt settlement
7. The **Boiz dinner** demo scenario

Boiz dinner expected totals (service charge ₱486, pizza ₱900 shared by six):

| Person | Total |
| --- | --- |
| Luis | ₱591 |
| John | ₱581 |
| Mike | ₱881 |
| Josh | ₱531 |
| Carlo | ₱231 |
| Ethan | ₱231 |
| **Bill** | **₱3,046** |

If Luis paid the restaurant, the others settle with Luis.

## Deployment

Deploy the Next.js app (Vercel or similar) and point env vars at the same Supabase project. Set `NEXT_PUBLIC_SITE_URL` to the production origin and add that origin to Supabase Auth redirect URLs.

## Future roadmap

- Real GCash (and other PH wallets) through the payment provider interface
- Receipt OCR → suggested line items
- Push notifications and payment reminders
- Richer group analytics
- Trip mode (a collection of Splits)

The schema already snapshots finalized calculations and keeps settlement rows payment-provider-agnostic so those features do not require a rewrite.
