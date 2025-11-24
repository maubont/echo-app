-- ADD MISSING UPDATE POLICY FOR CONVERSATIONS
-- This allows users to update conversations they are part of

CREATE POLICY "Users can update conversations they are part of" ON conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );
