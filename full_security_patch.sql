-- 1. Enable RLS on all public tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies (in case they exist)
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

-- 3. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. User Locations Policies
CREATE POLICY "Users can view visible locations" ON user_locations FOR SELECT USING (is_visible = true);
CREATE POLICY "Users can view own location" ON user_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location" ON user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location" ON user_locations FOR UPDATE USING (auth.uid() = user_id);

-- Ensure uniqueness for upsert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_locations_user_id_key') THEN
    ALTER TABLE user_locations ADD CONSTRAINT user_locations_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 5. User Statuses Policies
CREATE POLICY "Users can view non-expired statuses" ON user_statuses FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can create own status" ON user_statuses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own status" ON user_statuses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own status" ON user_statuses FOR DELETE USING (auth.uid() = user_id);

-- 6. Chat Security (Fixing Recursion & Adding Robust Checks)
DROP FUNCTION IF EXISTS public.is_chat_participant(_conversation_id uuid);
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conversations
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view conversations they are part of" ON conversations FOR SELECT USING (public.is_chat_participant(id));

-- Participants
CREATE POLICY "Users can add participants" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can view participants" ON conversation_participants FOR SELECT USING (public.is_chat_participant(conversation_id));

-- Messages
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_chat_participant(conversation_id)
);
CREATE POLICY "Users can view messages" ON messages FOR SELECT USING (
    public.is_chat_participant(conversation_id)
);

-- 7. Fix create_new_conversation RPC to be secure
CREATE OR REPLACE FUNCTION public.create_new_conversation(participant_ids uuid[])
RETURNS uuid AS $$
DECLARE
  new_conv_id uuid;
BEGIN
  -- Security check: Ensure the caller is part of the participant_ids array to prevent impersonation/spam
  IF NOT (auth.uid() = ANY(participant_ids)) THEN
    RAISE EXCEPTION 'You must be a participant in the conversation you are creating';
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO new_conv_id;
  
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, unnest(participant_ids);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
