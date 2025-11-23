-- Enable RLS for chat tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. CONVERSATIONS POLICIES
-- Allow users to insert new conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view conversations they are part of
-- (This requires a join with participants, which can be complex in RLS, 
--  so often we simplify or use a security definer function. 
--  For now, let's allow viewing if you can view the participants)
CREATE POLICY "Users can view conversations they are part of" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );

-- 2. PARTICIPANTS POLICIES
-- Allow users to add themselves or others to a conversation
CREATE POLICY "Users can add participants" ON conversation_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view participants of their conversations
CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR 
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
        )
    );

-- 3. MESSAGES POLICIES
-- Allow users to insert messages in conversations they belong to
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Allow users to view messages in conversations they belong to
CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );
