-- Create device_alerts table to store webhook events from ManageEngine MDM
CREATE TABLE IF NOT EXISTS public.device_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id VARCHAR NOT NULL REFERENCES public.devices(mdm_device_id) ON DELETE CASCADE,
  alert_name VARCHAR NOT NULL,
  severity VARCHAR DEFAULT 'Info',
  description TEXT,
  created_time TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow authenticated users to read device_alerts"
  ON public.device_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_alerts_device_id ON public.device_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_device_alerts_created_time ON public.device_alerts(created_time DESC);
