-- Promote user to SELLER role for testing
-- Replace the email with your test user's email

UPDATE users 
SET role = 'SELLER' 
WHERE email = 'temur@example.com'; -- Change this to your email

-- Verify the update
SELECT id, email, role, full_name FROM users WHERE email = 'temur@example.com';
