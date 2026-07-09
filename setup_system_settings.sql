-- Create the system_settings table to store configuration and cache values
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS but allow service_role to bypass it (default behavior)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- If you want to view it in the Supabase Dashboard, you might want to create a policy 
-- but since we are only using it server-side with service_role, RLS enabled with no policies 
-- perfectly protects it from public access.
