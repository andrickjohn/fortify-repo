-- Drop the existing check constraint
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_role_check;

-- Add the new check constraint with all supported roles
ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check 
CHECK (role IN (
    'super_admin', 
    'fortify_admin', 
    'fortify_viewer', 
    'district_admin', 
    'district_manager', 
    'district_editor', 
    'negotiator', 
    'data_entry', 
    'district_viewer'
));
