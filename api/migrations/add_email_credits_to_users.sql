-- Add email_credits column to users table
-- This will track the number of email discovery credits each user has

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_credits INTEGER DEFAULT 25;

-- Update existing users to have 25 free credits
UPDATE users 
SET email_credits = 25 
WHERE email_credits IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email_credits ON users(email_credits);