# API service modules

Every data read and write goes through `dch_app`. Nothing in this directory —
or anywhere under `src/` — may call `supabase.from(...)`.

`supabase.auth` is the one exception and stays: Supabase is the identity
provider, and the JWT it issues is what the API verifies.

## Why

The browser holds the Supabase *publishable* key. A `.from()` call goes straight
to Postgres with it, so it is not merely unprotected — it is **unprotectable**:
it never reaches the server, so no permission check, branch entitlement, or
audit can apply to it. The only fix is not making the call.

It also blocks row-level security. Once RLS is enabled, `supabase.from(...)`
returns **zero rows rather than an error**, so an unconverted screen renders
blank instead of failing loudly.

## Conventions

- One module per table, named after the table.
- Functions return `response.data.data` — the payload, not the envelope — so
  components consume the same shape PostgREST gave them.
- Branch, curriculum and year travel as headers, added by the axios interceptor
  in `src/utils/api.js`. Do **not** pass them per call.
- The API responds `{ status, data }`; errors surface as rejected promises and
  are shown by the interceptor's dialog. Callers only handle what they need to.

## Adding a table

Check whether an endpoint already exists before writing one:

```bash
grep "mount(app, '/api/" ../dch_app/src/index.ts
```

Most already do. See `dch_app/docs/frontend-integration-contract.md`.
