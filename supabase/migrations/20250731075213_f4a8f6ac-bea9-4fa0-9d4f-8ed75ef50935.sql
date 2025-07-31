
-- Add password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on password reset tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for password reset tokens
CREATE POLICY "Users can view their own reset tokens" ON public.password_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create reset tokens" ON public.password_reset_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update reset tokens" ON public.password_reset_tokens
  FOR UPDATE USING (true);

-- Add receipt analysis fields to existing receipts table
ALTER TABLE public.receipts 
ADD COLUMN IF NOT EXISTS receipt_type TEXT DEFAULT 'bike_parts',
ADD COLUMN IF NOT EXISTS extracted_items JSONB,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS language_detected TEXT;

-- Add spending tracking table
CREATE TABLE IF NOT EXISTS public.spending_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- 'month', '3months', '6months', 'year', 'all_time'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on spending summary
ALTER TABLE public.spending_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for spending summary
CREATE POLICY "Users can view their own spending summary" ON public.spending_summary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own spending summary" ON public.spending_summary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spending summary" ON public.spending_summary
  FOR UPDATE USING (auth.uid() = user_id);

-- Add account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on account deletion requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for account deletion requests
CREATE POLICY "Users can create their own deletion request" ON public.account_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own deletion request" ON public.account_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);
