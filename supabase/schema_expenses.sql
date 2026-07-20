-- Create the expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  description text,
  expense_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.expenses IS 'Operational expenses logged by admins';

-- Create an index for faster date queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view expenses (assuming admins only access the dashboard)
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON public.expenses;
CREATE POLICY "Authenticated users can read expenses"
  ON public.expenses FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert expenses
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
CREATE POLICY "Authenticated users can insert expenses"
  ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete expenses (optional, but good for correcting mistakes)
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses FOR DELETE TO authenticated USING (true);
