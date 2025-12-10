-- Migration: Add delivery columns to tickets table and address columns to users table
-- Date: 2024-12-10

-- Add delivery tracking columns to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (delivery_status IN ('pending', 'contacted', 'shipped', 'delivered', 'claimed'));

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMP;

-- Add address columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(200);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(200);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS province VARCHAR(100);

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Create indexes for delivery tracking
CREATE INDEX IF NOT EXISTS idx_tickets_delivery_status ON tickets(delivery_status);
CREATE INDEX IF NOT EXISTS idx_tickets_is_winner ON tickets(is_winner) WHERE is_winner = true;

-- Add FCM token column to users if not exists (for push notifications)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

COMMENT ON COLUMN tickets.delivery_status IS 'Status of prize delivery: pending, contacted, shipped, delivered, claimed';
COMMENT ON COLUMN tickets.tracking_number IS 'Shipping tracking number if applicable';
COMMENT ON COLUMN users.address_line1 IS 'User address for prize delivery';
