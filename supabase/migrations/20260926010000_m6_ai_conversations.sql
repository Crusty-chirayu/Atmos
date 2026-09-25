-- ============================================================================
-- ATMOS M6: AI Conversations and Grounded Message Threads
-- Migration: 20260926010000_m6_ai_conversations.sql
-- ============================================================================

-- 1. AI Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Weather Query',
    location_name TEXT,
    latitude NUMERIC(8, 5),
    longitude NUMERIC(8, 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ai_conversations_title_len CHECK (char_length(title) <= 200),
    CONSTRAINT chk_ai_conversations_coords CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude >= -90.00000 AND latitude <= 90.00000 AND longitude >= -180.00000 AND longitude <= 180.00000)
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
    ON public.ai_conversations(user_id, updated_at DESC);

CREATE TRIGGER trg_ai_conversations_updated_at
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. AI Messages Table
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    weather_context_snapshot JSONB,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_ai_messages_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
    ON public.ai_messages(conversation_id, created_at ASC);

-- ============================================================================
-- 3. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 3.1 AI Conversations Policies
CREATE POLICY "ai_conversations_select_own"
    ON public.ai_conversations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "ai_conversations_insert_own"
    ON public.ai_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_conversations_update_own"
    ON public.ai_conversations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_conversations_delete_own"
    ON public.ai_conversations
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 3.2 AI Messages Policies
CREATE POLICY "ai_messages_select_own"
    ON public.ai_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "ai_messages_insert_own"
    ON public.ai_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "ai_messages_delete_own"
    ON public.ai_messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = ai_messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 4. Role Grants & Privilege Restrictions
-- ============================================================================

REVOKE ALL ON TABLE public.ai_conversations FROM anon;
REVOKE ALL ON TABLE public.ai_messages FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_messages TO authenticated;
