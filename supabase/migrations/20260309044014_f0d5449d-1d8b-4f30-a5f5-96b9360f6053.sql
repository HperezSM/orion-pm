-- Auto-assign owner role to the designated owner email via trigger
CREATE OR REPLACE FUNCTION public.assign_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'gixo12l@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_assign_owner ON auth.users;
CREATE TRIGGER on_auth_user_assign_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_owner_role();