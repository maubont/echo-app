-- FINAL FIX FOR CHAT RLS RECURSION
-- This script resets all chat policies to a clean state

-- 1. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;

-- 2. Drop the helper function if it exists (to recreate it correctly)
DROP FUNCTION IF EXISTS public.is_chat_participant(_conversation_id uuid);

-- 3. Create the secure helper function
-- SECURITY DEFINER is crucial here: it runs with the privileges of the creator (postgres),
-- bypassing RLS on the underlying tables to avoid the infinite loop.
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_participants
    WHERE conversation_id = _conversation_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-enable RLS (just in case)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 5. Create New Policies using the secure function

-- CONVERSATIONS
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversations they are part of" ON conversations
    FOR SELECT USING (
        public.is_chat_participant(id)
    );

-- PARTICIPANTS
CREATE POLICY "Users can add participants" ON conversation_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        public.is_chat_participant(conversation_id)
    );

-- MESSAGES
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        public.is_chat_participant(conversation_id)
    );

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        public.is_chat_participant(conversation_id)
    );
