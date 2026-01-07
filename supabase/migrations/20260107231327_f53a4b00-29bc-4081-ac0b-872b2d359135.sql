-- Fix the overly permissive guest_profiles INSERT policy
DROP POLICY IF EXISTS "Users can create guest profiles" ON public.guest_profiles;

-- Replace with a more restrictive policy - only hosts can create guest profiles for their collaborations
-- or users can create their own guest profile
CREATE POLICY "Hosts can create guest profiles"
  ON public.guest_profiles FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'host'
    )
  );