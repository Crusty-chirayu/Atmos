-- ============================================================================
-- ATMOS M4: Authentication, Profiles, Saved Locations, and User Preferences
-- Migration: 20260926000000_m4_auth_and_user_data.sql
-- ============================================================================

-- 1. Helper function: updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_profiles_display_name_len CHECK (char_length(display_name) <= 100)
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Saved Locations Table
CREATE TABLE IF NOT EXISTS public.saved_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT,
    country_code VARCHAR(2),
    admin_area TEXT,
    latitude NUMERIC(8, 5) NOT NULL,
    longitude NUMERIC(8, 5) NOT NULL,
    timezone TEXT,
    provider_location_id TEXT,
    label TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_saved_locations_latitude CHECK (latitude >= -90.00000 AND latitude <= 90.00000),
    CONSTRAINT chk_saved_locations_longitude CHECK (longitude >= -180.00000 AND longitude <= 180.00000),
    CONSTRAINT chk_saved_locations_label_len CHECK (char_length(label) <= 60),
    CONSTRAINT uq_saved_locations_user_coords UNIQUE (user_id, latitude, longitude)
);

CREATE INDEX IF NOT EXISTS idx_saved_locations_user_order 
    ON public.saved_locations(user_id, display_order, created_at DESC);

CREATE TRIGGER trg_saved_locations_updated_at
    BEFORE UPDATE ON public.saved_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    temperature_unit TEXT NOT NULL DEFAULT 'celsius',
    wind_speed_unit TEXT NOT NULL DEFAULT 'kmh',
    precipitation_unit TEXT NOT NULL DEFAULT 'mm',
    theme TEXT NOT NULL DEFAULT 'system',
    reduced_motion BOOLEAN NOT NULL DEFAULT false,
    default_location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_preferences_temperature_unit CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
    CONSTRAINT chk_preferences_wind_speed_unit CHECK (wind_speed_unit IN ('kmh', 'mph', 'ms', 'knots')),
    CONSTRAINT chk_preferences_precipitation_unit CHECK (precipitation_unit IN ('mm', 'inch')),
    CONSTRAINT chk_preferences_theme CHECK (theme IN ('dark', 'light', 'system'))
);

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Safe User Bootstrap Trigger
-- Idempotently creates profile & default preferences on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop and recreate the trigger to ensure idempotency
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Revoke direct execution privileges on bootstrap function from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 6. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 6.1 Profiles Policies
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- 6.2 Saved Locations Policies
CREATE POLICY "saved_locations_select_own"
    ON public.saved_locations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "saved_locations_insert_own"
    ON public.saved_locations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_locations_update_own"
    ON public.saved_locations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_locations_delete_own"
    ON public.saved_locations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6.3 User Preferences Policies
CREATE POLICY "user_preferences_select_own"
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
    ON public.user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
    ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own"
    ON public.user_preferences
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Role Grants & Privilege Restrictions
-- ============================================================================

-- Explicitly revoke all privileges from anon (unauthenticated visitors)
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.saved_locations FROM anon;
REVOKE ALL ON TABLE public.user_preferences FROM anon;

-- Grant standard CRUD access to authenticated users (governed strictly by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_preferences TO authenticated;
