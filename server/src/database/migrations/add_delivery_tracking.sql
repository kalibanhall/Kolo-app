-- Migration: Add delivery tracking to tickets table
-- Date: 2025-12-04
-- Description: Add columns to track prize delivery status for winning tickets

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending' 
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
ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster queries on delivery status
CREATE INDEX IF NOT EXISTS idx_tickets_delivery_status ON tickets(delivery_status);

-- Add comment
COMMENT ON COLUMN tickets.delivery_status IS 'Status: pending (not contacted), contacted (winner notified), shipped (in transit), delivered (received), claimed (prize collected)';
