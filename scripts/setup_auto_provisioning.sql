-- 1. Create the function that will run on every new signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_district_id uuid;
begin
  -- Create a new District for the user (using their name/email)
  insert into public.districts (name, subscription_tier, onboarded_date)
  values (
    split_part(new.email, '@', 1) || '''s District', 
    'pilot',
    CURRENT_DATE
  )
  returning id into new_district_id;

  -- Create the User profile linked to the new district
  insert into public.users (id, email, district_id, role)
  values (
    new.id, 
    new.email, 
    new_district_id, 
    'district_editor' -- Default role: Can upload contracts but cannot manage Settings/Users
  );

  return new;
end;
$$;

-- 2. Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
