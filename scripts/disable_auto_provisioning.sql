-- Update handle_new_user to ONLY process invitations
-- and STOP creating new districts automatically.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    invite_record RECORD;
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
        -- Case B: No invite. 
        -- DO NOTHING. 
        -- User exists in Auth but not in Public. 
        -- App should handle "Profile Setup" or "Pending Approval" state if needed.
        -- This prevents "John's District" creation.
        
        -- Optionally, we could create a user with NULL district if schema allows, 
        -- but for now, we simply stop the auto-creation.
        NULL;
    END IF;

    RETURN new;
END;
$$;
