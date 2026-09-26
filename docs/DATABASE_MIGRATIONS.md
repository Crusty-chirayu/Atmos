# ATMOS Database Architecture & Migrations Guide

## 1. Overview
ATMOS utilizes PostgreSQL via Supabase with strict Row Level Security (RLS) policies. Every user-owned record is cryptographically tied to `auth.users(id)` and cannot be accessed or manipulated by unauthorized users or anonymous clients.

---

## 2. Table Inventory

| Table Name | Primary Key | Foreign Keys | Migration | Purpose & Constraints |
|---|---|---|---|---|
| `profiles` | `id UUID` | `auth.users(id) ON DELETE CASCADE` | `20260926000000` | User display names, avatar URLs, and profile timestamps. |
| `saved_locations` | `id UUID` | `user_id -> auth.users(id) ON DELETE CASCADE` | `20260926000000` | Stored locations for rapid retrieval. Enforces unique `(user_id, latitude, longitude)`. |
| `user_preferences` | `user_id UUID` | `auth.users(id) ON DELETE CASCADE` | `20260926000000` | Meteorological unit preferences (Celsius/Fahrenheit, kmh/mph/ms/knots, mm/inch) and theme options. |
| `ai_conversations` | `id UUID` | `user_id -> auth.users(id) ON DELETE CASCADE` | `20260926010000` | Conversation sessions with title, active location context, and metadata. |
| `ai_messages` | `id UUID` | `conversation_id -> ai_conversations(id) ON DELETE CASCADE` | `20260926010000` | Individual message turns with roles (`user`, `model`, `system`), grounding snapshots, and token usage. |
| `alert_rules` | `id UUID` | `user_id -> auth.users(id) ON DELETE CASCADE` | `20260926020000` | User-defined weather thresholds (`temp_above`, `temp_below`, `high_wind`, `precipitation`, `freeze`, `severe_weather`) with cooldowns. |
| `notifications` | `id UUID` | `user_id -> auth.users(id) ON DELETE CASCADE` | `20260926020000` | Dispatched weather notifications with read/unread status, location metadata, and unique deduplication keys. |
| `push_subscriptions`| `id UUID` | `user_id -> auth.users(id) ON DELETE CASCADE` | `20260926020000` | Web Push endpoints and P256DH/auth cryptographic keys. Enforces unique `(user_id, endpoint)`. |

---

## 3. Row Level Security (RLS) Policy Matrix

| Table | SELECT | INSERT | UPDATE | DELETE | Anon Role |
|---|---|---|---|---|---|
| `profiles` | `auth.uid() = id` (or public) | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | Read-only |
| `saved_locations` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |
| `user_preferences` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |
| `ai_conversations` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |
| `ai_messages` | Scoped via conversation ownership | Scoped via conversation ownership | Scoped via conversation ownership | Scoped via conversation ownership | **DENIED** |
| `alert_rules` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |
| `notifications` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |
| `push_subscriptions`| `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | **DENIED** |

---

## 4. Migration Execution Sequence

When setting up a new Supabase database instance:

1. **Migration 1 (M4 Baseline)**:
   ```bash
   supabase/migrations/20260926000000_m4_auth_and_user_data.sql
   ```
   Creates `set_updated_at()`, `handle_new_user()`, `profiles`, `saved_locations`, and `user_preferences`.
2. **Migration 2 (M6 AI Platform)**:
   ```bash
   supabase/migrations/20260926010000_m6_ai_conversations.sql
   ```
   Creates `ai_conversations`, `ai_messages`, cascading indexes, and conversation-scoped RLS policies.
3. **Migration 3 (M7 Notifications & Alerts)**:
   ```bash
   supabase/migrations/20260926020000_m7_notifications.sql
   ```
   Creates `alert_rules`, `notifications`, `push_subscriptions`, deduplication constraints, and cron execution indices.

### Applying Migrations via Supabase CLI
```bash
# Link project
npx supabase link --project-ref your-project-id

# Push migrations sequentially
npx supabase db push
```

### Applying Migrations via Supabase Dashboard SQL Editor
Copy and run each migration in numerical order (`20260926000000` -> `20260926010000` -> `20260926020000`). All statements are non-destructive and use `IF NOT EXISTS` / `CREATE OR REPLACE`.
