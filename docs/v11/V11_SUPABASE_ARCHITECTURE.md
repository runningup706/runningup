
# Supabase V11 architecture

- Local-first Supabase CLI, versioned migrations and seed.
- Public schema exposes only minimal RLS-protected API surfaces.
- Raw activity, canonicalization, verification, odds and reward calculation live in private schema.
- Important mutations use DB transactions and immutable ledgers.
- Edge Functions orchestrate OAuth/webhooks for Strava/Garmin/Samsung approval adapters and account jobs.
- `apply_verified_run_v11` must canonicalize the run, grant exactly one reward, update world stride, My Runner evolution, one set of monthly checkpoints and social summaries in a retry-safe flow.
- Client may preview rewards but may not finalize them.
- Realtime channels for crew/lounge must be private and membership-checked.
- Every exposed table has RLS and pgTAP cross-user denial tests.
