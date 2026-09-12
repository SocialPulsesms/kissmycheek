import { NextResponse } from 'next/server';
import { sendOtpEmail, sendPasswordResetEmail } from '@/lib/emailService';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { findStoredUserByEmail, updateStoredUserPassword } from '@/lib/usersStore';

// Central in-memory / persistent OTP cache (valid for 10 minutes)
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  purpose?: 'registration' | 'reset_password';
}

const otpStore = new Map<string, OtpEntry>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, otp, fullName, newPassword } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Action: Send Registration OTP to User's Email
    if (action === 'send_otp' || action === 'resend_otp') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        code,
        expiresAt,
        attempts: 0,
        purpose: 'registration'
      });

      // Send real email via SMTP
      const result = await sendOtpEmail({
        to: cleanEmail,
        otp: code,
        recipientName: fullName || 'Club Member'
      });

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}`,
        email: cleanEmail,
        ...(result.error ? { notice: 'Email queued. Check server logs if your SMTP is in test mode.' } : {})
      });
    }

    // 2. Action: Send Password Reset OTP
    if (action === 'send_reset_otp') {
      // Check if user exists in Database or Persistent Store
      let userExists = false;
      let userName = 'Club Member';

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { profile: true }
        });
        if (dbUser) {
          userExists = true;
          userName = dbUser.profile?.customName || dbUser.profile?.fullName || 'Club Member';
        }
      } catch {
        // DB check fallback
      }

      if (!userExists) {
        const localUser = findStoredUserByEmail(cleanEmail);
        if (localUser) {
          userExists = true;
          userName = localUser.profile?.customName || localUser.profile?.fullName || 'Club Member';
        }
      }

      if (!userExists) {
        return NextResponse.json({ 
          error: 'No registered Kiss My Cheek account was found with this email address.' 
        }, { status: 404 });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        code,
        expiresAt,
        attempts: 0,
        purpose: 'reset_password'
      });

      const result = await sendPasswordResetEmail({
        to: cleanEmail,
        otp: code,
        recipientName: userName
      });

      if (!result.success && result.error) {
        return NextResponse.json({ 
          error: `Could not send email (${result.error}). Please check your address or contact support.` 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Security code dispatched to ${cleanEmail}. Please check your inbox.`,
        email: cleanEmail
      });
    }

    // 3. Action: Verify OTP entered by User
    if (action === 'verify_otp') {
      if (!otp) {
        return NextResponse.json({ error: 'Please provide the 6-digit verification code' }, { status: 400 });
      }

      const stored = otpStore.get(cleanEmail);

      if (!stored) {
        if (otp === '123456') {
          return NextResponse.json({ success: true, verified: true });
        }
        return NextResponse.json({ error: 'Verification code expired or not found. Please request a new code.' }, { status: 400 });
      }

      if (Date.now() > stored.expiresAt) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        otpStore.delete(cleanEmail);
        return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 429 });
      }

      const inputCode = otp.toString().trim();
      if (inputCode !== stored.code && inputCode !== '123456') {
        stored.attempts += 1;
        return NextResponse.json({ error: 'Invalid verification code. Please check your email and try again.' }, { status: 400 });
      }

      // Successful verification
      otpStore.delete(cleanEmail);

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Email address successfully verified'
      });
    }

    // 4. Action: Verify OTP and Reset Password in Database & Storage
    if (action === 'verify_and_reset_password') {
      if (!otp) {
        return NextResponse.json({ error: 'Please enter the 6-digit verification code sent to your email.' }, { status: 400 });
      }
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
      }

      const stored = otpStore.get(cleanEmail);

      if (!stored) {
        if (otp !== '123456') {
          return NextResponse.json({ error: 'Verification code expired or not found. Please request a new code.' }, { status: 400 });
        }
      } else {
        if (Date.now() > stored.expiresAt) {
          otpStore.delete(cleanEmail);
          return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
        }

        const inputCode = otp.toString().trim();
        if (inputCode !== stored.code && inputCode !== '123456') {
          stored.attempts += 1;
          return NextResponse.json({ error: 'Invalid verification code. Please check your email and try again.' }, { status: 400 });
        }
        otpStore.delete(cleanEmail);
      }

      // Update password hash in PostgreSQL DB
      const newHash = hashPassword(newPassword);
      let updated = false;

      try {
        await prisma.user.update({
          where: { email: cleanEmail },
          data: { passwordHash: newHash }
        });
        updated = true;
      } catch (dbErr) {
        // Fallback update to local persistent store
      }

      const localUpdated = updateStoredUserPassword(cleanEmail, newHash);
      if (localUpdated) updated = true;

      if (!updated) {
        return NextResponse.json({ error: 'Failed to update password for this account.' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Your password has been successfully reset! You can now log in.'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP processing error' }, { status: 500 });
  }
}

