-- Migration: Add ticket_reservations table for cart reservation system
-- Created: 2025-01-XX

-- Create ticket_reservations table
CREATE TABLE IF NOT EXISTS ticket_reservations (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_number VARCHAR(20) NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'reserved' CHECK (status IN ('reserved', 'purchased', 'expired', 'cancelled')),
  UNIQUE(campaign_id, ticket_number)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_campaign ON ticket_reservations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_user ON ticket_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_expires ON ticket_reservations(expires_at);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_status ON ticket_reservations(status);

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ticket_reservations 
  WHERE status = 'reserved' 
    AND expires_at < CURRENT_TIMESTAMP;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-reservations', '*/5 * * * *', 'SELECT cleanup_expired_reservations()');

-- Comment on table
COMMENT ON TABLE ticket_reservations IS 'Temporary reservations for tickets in user carts. Auto-expires after a set duration.';
