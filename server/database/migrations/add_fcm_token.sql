-- Add FCM token column to users table for Firebase push notifications
-- This allows storing the Firebase Cloud Messaging token for each user

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for performance when querying by FCM token
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token);

-- Add comment to document the column
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
