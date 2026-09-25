# ATMOS Deployment and Operations

## 1. Target topology
- Vercel: Next.js application and supported serverless/cron workloads.
- Supabase: PostgreSQL, Auth, RLS, and selected edge capabilities.
- Weather/Gemini/map/speech providers: external services accessed through adapters.
- Optional monitoring provider selected after privacy, cost, and framework compatibility review.

## 2. Environments
Maintain separate development, preview/staging, and production configuration where feasible. Do not share production secrets with local development or untrusted preview deployments.

## 3. Deployment sequence
1. Review migrations and apply to the intended Supabase project.
2. Configure and validate server/client environment variables.
3. Deploy preview and run smoke tests.
4. Verify authentication redirects, RLS, provider access, map configuration, AI quota handling, and alert scheduler.
5. Promote to production only after release gates in `TEST.md` pass.
6. Verify health, logs, provider error rates, and scheduled-job execution.

## 4. Cost and quota controls
- Verify current Vercel, Supabase, Gemini, weather, map tile, and push provider plans/limits before release.
- Use caching, rate limits, bounded AI context, per-user quotas, and usage visibility.
- Do not assume free tiers include unlimited commercial use, cron frequency, database storage, egress, or AI calls.
- Set alerts or operational safeguards before enabling public access.
- Degrade gracefully when a quota is exhausted; never silently substitute fake data.

## 5. Scheduled alerts
- Use durable scheduled execution, not browser timers or an in-memory process.
- Confirm schedule frequency, timeout, and invocation limits for the selected hosting plans.
- Make processing idempotent, bounded, observable, and safe to retry.
- Store evaluation cursors/last-checked timestamps and deduplication keys.
- Provide a manual/test execution path restricted to authorized operators.

## 6. Monitoring and incident response
Track sanitized metrics for:
- App/server errors and latency.
- Weather provider success, latency, cache hit rate, and stale responses.
- Gemini latency, quota errors, token/usage estimates where available.
- Alert evaluation and delivery failures.
- Scheduler failures and database resource usage.

Document provider outage behavior, credential rotation, rollback, migration recovery, and user-facing status messaging before launch.
