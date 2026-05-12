-- =================================================================================
-- CHAT EFÍMERO: RPC actualizado para soportar modo y expiración
-- Ejecutar en SQL Editor de Supabase
-- =================================================================================

-- 1. Actualizar la función create_new_conversation para aceptar modo y expiración
CREATE OR REPLACE FUNCTION public.create_new_conversation(
  participant_ids uuid[],
  conv_mode text DEFAULT 'networking',
  conv_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_conv_id uuid;
BEGIN
  -- 1. Create the conversation with mode and optional expiry
  INSERT INTO conversations (mode, expires_at)
  VALUES (conv_mode, conv_expires_at)
  RETURNING id INTO new_conv_id;

  -- 2. Add participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  SELECT new_conv_id, unnest(participant_ids);

  RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para limpiar conversaciones expiradas y sus mensajes
-- Se puede ejecutar periódicamente vía pg_cron o manualmente
CREATE OR REPLACE FUNCTION public.cleanup_expired_conversations()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM conversations
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
