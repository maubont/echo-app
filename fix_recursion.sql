-- FIX INFINITE RECURSION IN RLS POLICIES

-- 1. Create a secure function to get user's conversations
-- This function runs as the database owner (SECURITY DEFINER), bypassing RLS.
-- This breaks the infinite recursion loop when policies query the same table.
CREATE OR REPLACE FUNCTION get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT conversation_id 
  FROM conversation_participants 
  WHERE user_id = auth.uid();
$$;

-- 2. Update conversation_participants policy to use the secure function
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;

CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        conversation_id IN (SELECT get_my_conversation_ids())
    );

-- 3. Update messages policy to use the secure function (Optimization & Safety)
DROP POLICY IF EXISTS "Users can view messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        conversation_id IN (SELECT get_my_conversation_ids())
    );

DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        conversation_id IN (SELECT get_my_conversation_ids())
    );

-- 4. Update Conversations policies to use the function
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;

CREATE POLICY "Users can view conversations they are part of" ON conversations
    FOR SELECT USING (
        id IN (SELECT get_my_conversation_ids())
    );

-- Re-apply the UPDATE policy using the safe function
DROP POLICY IF EXISTS "Users can update conversations they are part of" ON conversations;

CREATE POLICY "Users can update conversations they are part of" ON conversations
    FOR UPDATE USING (
        id IN (SELECT get_my_conversation_ids())
    )
    WITH CHECK (
        id IN (SELECT get_my_conversation_ids())
    );
