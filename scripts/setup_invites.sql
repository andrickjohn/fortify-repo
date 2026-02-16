-- 1. Create Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN (
        'super_admin', 
        'fortify_admin', 
        'fortify_viewer', 
        'district_admin', 
        'district_manager', 
        'district_editor', 
        'negotiator', 
        'data_entry', 
        'district_viewer'
    )),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES public.users(id),
    UNIQUE(email, district_id) -- Prevent duplicate invites for same district
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see invites for their own district
CREATE POLICY district_isolation_invitations ON public.invitations
    FOR ALL USING (district_id = get_my_district_id());

-- 2. Update the New User Handler to check for invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    invite_record RECORD;
    new_district_id uuid;
    assigned_role text;
BEGIN
    -- Check if there is a pending invitation for this email
    SELECT * INTO invite_record 
    FROM public.invitations 
    WHERE email = new.email AND status = 'pending'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF invite_record IS NOT NULL THEN
        -- Case A: User was invited. Join existing district.
        INSERT INTO public.users (id, email, district_id, role)
        VALUES (
            new.id, 
            new.email, 
            invite_record.district_id, 
            invite_record.role
        );

        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted' 
        WHERE id = invite_record.id;
        
    ELSE
        -- Case B: No invite. Create new District (Default behavior).
        INSERT INTO public.districts (name, subscription_tier, onboarded_date)
        VALUES (
            split_part(new.email, '@', 1) || '''s District', 
            'pilot',
            CURRENT_DATE
        )
        RETURNING id INTO new_district_id;

        -- Assign user as ADMIN of their new district (or Editor if we prefer that default)
        -- Per recent discussion, default new organic signups to 'district_editor' to verify account first? 
        -- Or 'district_admin' because they started a new district? 
        -- Usually if you start a district you are the Admin. 
        -- Let's stick to 'district_admin' for NEW DISTRICT creators, but 'district_editor' was requested earlier.
        -- User said: "not sure if i want new users to to have admin role by default."
        -- If they create a district, they MUST be admin, otherwise no one is admin.
        -- So: New District Creator -> Admin. Invited User -> Role specified in invite.
        
        INSERT INTO public.users (id, email, district_id, role)
        VALUES (
            new.id, 
            new.email, 
            new_district_id, 
            'district_admin' -- Creator of district must be admin
        );
    END IF;

    RETURN new;
END;
$$;
