-- ============================================================================
-- ATMOS M7: Weather Alerts, In-App Notifications, and Web Push Subscriptions
-- Migration: 20260926020000_m7_notifications.sql
-- ============================================================================

-- 1. Alert Rules Table
CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    threshold_value NUMERIC NOT NULL,
    threshold_unit TEXT NOT NULL,
    comparison_operator TEXT NOT NULL DEFAULT '>',
    location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
    location_name TEXT NOT NULL,
    latitude NUMERIC(8, 5) NOT NULL,
    longitude NUMERIC(8, 5) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    cooldown_minutes INTEGER NOT NULL DEFAULT 360,
    last_evaluated_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_alert_type CHECK (
        alert_type IN ('temp_above', 'temp_below', 'high_wind', 'precipitation', 'freeze', 'severe_weather')
    ),
    CONSTRAINT chk_comparison_operator CHECK (
        comparison_operator IN ('>', '>=', '<', '<=', '==')
    ),
    CONSTRAINT chk_cooldown_range CHECK (cooldown_minutes >= 15 AND cooldown_minutes <= 10080),
    CONSTRAINT chk_alert_coords CHECK (
        latitude >= -90.00000 AND latitude <= 90.00000 AND longitude >= -180.00000 AND longitude <= 180.00000
    )
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_user_enabled
    ON public.alert_rules(user_id, enabled);

CREATE INDEX IF NOT EXISTS idx_alert_rules_eval_scan
    ON public.alert_rules(enabled, last_evaluated_at ASC NULLS FIRST);

CREATE TRIGGER trg_alert_rules_updated_at
    BEFORE UPDATE ON public.alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'weather_alert',
    severity TEXT NOT NULL DEFAULT 'warning',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    location_name TEXT,
    latitude NUMERIC(8, 5),
    longitude NUMERIC(8, 5),
    read BOOLEAN NOT NULL DEFAULT false,
    dedup_key TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_notification_severity CHECK (
        severity IN ('info', 'warning', 'critical')
    ),
    CONSTRAINT chk_notification_category CHECK (
        category IN ('weather_alert', 'system', 'trip_advisory')
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_inbox
    ON public.notifications(user_id, read, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedup
    ON public.notifications(user_id, dedup_key);

-- 3. Web Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_push_subscription_user_endpoint UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
    ON public.push_subscriptions(user_id, enabled);

CREATE TRIGGER trg_push_subscriptions_updated_at
    BEFORE UPDATE ON public.push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4.1 Alert Rules Policies
CREATE POLICY "alert_rules_select_own"
    ON public.alert_rules
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "alert_rules_insert_own"
    ON public.alert_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_rules_update_own"
    ON public.alert_rules
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alert_rules_delete_own"
    ON public.alert_rules
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4.2 Notifications Policies
CREATE POLICY "notifications_select_own"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4.3 Push Subscriptions Policies
CREATE POLICY "push_subscriptions_select_own"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own"
    ON public.push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_update_own"
    ON public.push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
    ON public.push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Role Grants & Privilege Restrictions
-- ============================================================================

REVOKE ALL ON TABLE public.alert_rules FROM anon;
REVOKE ALL ON TABLE public.notifications FROM anon;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated;
