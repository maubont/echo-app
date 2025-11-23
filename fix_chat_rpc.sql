-- FIX CHAT CREATION RACE CONDITION
-- Create a secure function to handle chat creation atomically

CREATE OR REPLACE FUNCTION public.create_new_conversation(participant_ids uuid[])
RETURNS uuid AS $$
DECLARE
  new_conv_id uuid;
BEGIN
  -- 1. Create the conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  -- 2. Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, unnest(participant_ids);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
