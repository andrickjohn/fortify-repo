import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Authenticate the requester
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Authorization: Check if requester is an Admin
        const { data: requesterProfile } = await supabase
            .from('users')
            .select('role, district_id')
            .eq('id', user.id)
            .single();

        if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'district_admin')) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
        }

        // 3. Parse Request
        const body = await request.json();
        const { email, password, fullName, role, district_id } = body;

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase();

        // Validate district match (unless Superadmin, who could theoretically create users anywhere, but for now stick to own district)
        // If requester is district_admin, they can only add to their own district.
        if (requesterProfile.role === 'district_admin' && district_id !== requesterProfile.district_id) {
            return NextResponse.json({ error: 'Forbidden: You can only add users to your own district' }, { status: 403 });
        }

        // Use requester's district if not provided (default behavior)
        const targetDistrictId = district_id || requesterProfile.district_id;

        // 4. Create/Update Invitation Record
        // We use upsert to ensure that if an invite already exists (e.g. user didn't get email), we just update it
        // and proceed to create the Auth user. This prevents "unique constraint" errors.
        const { error: inviteError } = await supabaseAdmin
            .from('invitations')
            .upsert({
                email: normalizedEmail,
                district_id: targetDistrictId,
                role,
                invited_by: user.id,
                status: 'pending'
            }, {
                onConflict: 'email, district_id',
                ignoreDuplicates: false
            });

        if (inviteError) {
            return NextResponse.json({ error: `Failed to ensure invite record: ${inviteError.message}` }, { status: 500 });
        }

        // 5. Create Auth User
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true, // Auto-confirm since admin created it
            user_metadata: {
                full_name: fullName
            }
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: newUser });

    } catch (err: any) {
        console.error('Create user error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
