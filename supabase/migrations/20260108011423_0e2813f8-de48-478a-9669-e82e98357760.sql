-- 1. Fix SECURITY DEFINER functions with input validation

-- Update has_role function with null check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END;
$$;

-- Update is_workspace_member function with null check
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL OR _workspace_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id
      UNION
      SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id
    )
  END;
$$;

-- Update can_access_collaboration function with null check
CREATE OR REPLACE FUNCTION public.can_access_collaboration(_user_id uuid, _collaboration_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL OR _collaboration_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.collaborations c
      WHERE c.id = _collaboration_id
      AND (
        c.host_id = _user_id
        OR c.editor_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.guest_profiles gp 
          WHERE gp.id = c.guest_profile_id AND gp.user_id = _user_id
        )
      )
    )
  END;
$$;

-- 2. Add database constraints for guest_profiles validation
ALTER TABLE public.guest_profiles
  ADD CONSTRAINT guest_profiles_name_length CHECK (length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT guest_profiles_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT guest_profiles_email_length CHECK (length(email) <= 255),
  ADD CONSTRAINT guest_profiles_bio_length CHECK (bio IS NULL OR length(bio) <= 2000),
  ADD CONSTRAINT guest_profiles_website_url_length CHECK (website_url IS NULL OR length(website_url) <= 500),
  ADD CONSTRAINT guest_profiles_pronunciation_length CHECK (pronunciation_notes IS NULL OR length(pronunciation_notes) <= 200);

-- 3. Make headshots bucket private and update RLS policies
UPDATE storage.buckets SET public = false WHERE id = 'headshots';

-- Drop the public access policy
DROP POLICY IF EXISTS "Headshots are publicly accessible" ON storage.objects;

-- Create authenticated-only view policy for active collaborations
CREATE POLICY "Authenticated users can view headshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'headshots'
);