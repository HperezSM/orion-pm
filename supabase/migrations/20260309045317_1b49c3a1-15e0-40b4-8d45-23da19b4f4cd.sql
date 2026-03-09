-- Create trigger function to auto-create workspace on new user signup
CREATE OR REPLACE FUNCTION public.create_workspace_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create workspace for new user with 14-day trial
  INSERT INTO public.workspaces (
    name,
    owner_id,
    tier,
    trial_ends_at,
    billing_cycle,
    seats_used,
    ai_actions_used,
    storage_used_gb
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
    NEW.id,
    'pro',
    NOW() + INTERVAL '14 days',
    'monthly',
    1,
    0,
    0
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_workspace_on_signup();