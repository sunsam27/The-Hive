import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const link = `${baseUrl}/verify-email/${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your email — The Hive',
    html: `
      <div style="font-family: 'Space Grotesk', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to The Hive</h1>
        <p style="color: #666; margin-bottom: 24px;">Hi ${name},</p>
        <p style="color: #666; margin-bottom: 24px;">Click the button below to verify your email address and activate your account.</p>
        <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #0071e3; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Verify Email</a>
        <p style="color: #999; margin-top: 32px; font-size: 13px;">Or paste this link: ${link}</p>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Resend error:', error);
    throw error;
  }

  console.log('📧 Verification email sent:', data?.id);
}

export async function sendResetEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  const link = `${baseUrl}/reset-password?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your password — The Hive',
    html: `
      <div style="font-family: 'Space Grotesk', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Reset your password</h1>
        <p style="color: #666; margin-bottom: 24px;">Hi ${name},</p>
        <p style="color: #666; margin-bottom: 24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #0071e3; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Reset Password</a>
        <p style="color: #999; margin-top: 32px; font-size: 13px;">Or paste this link: ${link}</p>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Resend error:', error);
    throw error;
  }

  console.log('📧 Reset email sent:', data?.id);
}
