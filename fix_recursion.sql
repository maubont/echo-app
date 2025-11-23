-- FIX INFINITE RECURSION IN RLS POLICIES

-- 1. Create a secure helper function to check participation
-- SECURITY DEFINER allows this function to bypass RLS to avoid loops
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

-- 2. Fix Conversations Policy
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;
CREATE POLICY "Users can view conversations they are part of" ON conversations
    FOR SELECT USING (
        public.is_chat_participant(id)
    );

-- 3. Fix Participants Policy (The one causing the 500 error)
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        public.is_chat_participant(conversation_id)
    );

-- 4. Fix Messages Policy
DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        public.is_chat_participant(conversation_id)
    );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        public.is_chat_participant(conversation_id)
    );
