import { resend } from '@/lib/resend';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Authenticate
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get requester info
        const { data: requesterProfile } = await supabase
            .from('users')
            .select('role, district_id, full_name')
            .eq('id', user.id)
            .single();

        if (!requesterProfile || (requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'district_admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Get district name
        const { data: district } = await supabase
            .from('districts')
            .select('name')
            .eq('id', requesterProfile.district_id)
            .single();

        // 4. Parse request
        const body = await request.json();
        const { email, role } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const inviterName = requesterProfile.full_name || user.email;
        const districtName = district?.name || 'your organization';
        const signupUrl = `${new URL(request.url).origin}/signup`;

        const roleLabelMap: Record<string, string> = {
            'super_admin': 'Fortify Superuser',
            'fortify_admin': 'Fortify Admin',
            'fortify_viewer': 'Fortify Read-Only',
            'district_admin': 'District Admin',
            'district_manager': 'Manager',
            'negotiator': 'Negotiator',
            'data_entry': 'Data Entry',
            'district_viewer': 'Viewer',
        };
        const roleLabel = roleLabelMap[role] || role;

        // 5. Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Fortify <onboarding@resend.dev>',
            to: [email],
            subject: `You've been invited to Fortify — ${districtName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#1e40af,#3b82f6); padding:32px 40px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:800; letter-spacing:-0.5px;">Fortify</h1>
                            <p style="margin:8px 0 0; color:rgba(255,255,255,0.8); font-size:13px; font-weight:500;">Procurement Intelligence Platform</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 8px; color:#0f172a; font-size:20px; font-weight:700;">You're Invited!</h2>
                            <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.6;">
                                <strong style="color:#334155;">${inviterName}</strong> has invited you to join
                                <strong style="color:#334155;">${districtName}</strong> on Fortify.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc; border-radius:12px; margin-bottom:24px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <p style="margin:0 0 4px; color:#94a3b8; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Your Role</p>
                                        <p style="margin:0; color:#1e40af; font-size:14px; font-weight:700;">${roleLabel}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.6;">
                                Click the button below to create your account and get started. Use this email address (<strong>${email}</strong>) when signing up.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${signupUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:14px 40px; border-radius:12px; font-size:14px; font-weight:700; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 40px 32px; border-top:1px solid #f1f5f9; text-align:center;">
                            <p style="margin:0; color:#94a3b8; font-size:11px;">
                                This invitation was sent by ${inviterName}. If you didn't expect this, you can safely ignore it.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `.trim(),
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            return NextResponse.json({ error: `Failed to send email: ${emailError.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, emailId: emailData?.id });

    } catch (err: any) {
        console.error('Send invite email error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
