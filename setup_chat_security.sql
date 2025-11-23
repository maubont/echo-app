-- CONSOLIDATED CHAT SECURITY SETUP
-- 1. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversations they are part of" ON conversations;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;

-- 3. Create Policies

-- CONVERSATIONS
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view conversations they are part of" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );

-- PARTICIPANTS
CREATE POLICY "Users can add participants" ON conversation_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR 
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
        )
    );

-- MESSAGES
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- 4. Create RPC Function for Atomic Creation
CREATE OR REPLACE FUNCTION public.create_new_conversation(participant_ids uuid[])
RETURNS uuid AS $$
DECLARE
  new_conv_id uuid;
BEGIN
  -- Create the conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, unnest(participant_ids);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
