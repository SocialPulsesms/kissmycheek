import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signJWT, hashPassword } from '@/lib/auth';
import { findStoredUserByEmail } from '@/lib/usersStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, securityPin } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Administrative Email and Master Password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check Master Admin fallback credentials
    const isMasterAdminEmail = cleanEmail === 'admin@kissmycheek.com' || cleanEmail === 'info@socialpulsesms.org';
    const isMasterAdminPassword = password === 'Admin1234!' || password === 'iF@1blinkin1212!`~';

    let adminRecord: {
      id: string;
      email: string;
      role: 'ADMIN' | 'MEMBER' | 'VIP';
      membershipTier: any;
      fullName: string;
      isVerified: boolean;
    } | null = null;

    if (isMasterAdminEmail && isMasterAdminPassword) {
      adminRecord = {
        id: cleanEmail === 'admin@kissmycheek.com' ? 'usr-admin-master-01' : 'usr-admin-business-02',
        email: cleanEmail,
        role: 'ADMIN',
        membershipTier: 'ELITE',
        fullName: cleanEmail === 'admin@kissmycheek.com' ? 'Executive Administrator' : 'Platform Super Admin',
        isVerified: true
      };
    } else {
      // 1. Try DB
      try {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: { profile: true }
        });
        if (user && user.role === 'ADMIN') {
          const isValid = verifyPassword(password, user.passwordHash);
          if (isValid) {
            adminRecord = {
              id: user.id,
              email: user.email,
              role: 'ADMIN',
              membershipTier: user.membershipTier,
              fullName: user.profile?.fullName || 'Administrator',
              isVerified: user.isVerified
            };
          }
        }
      } catch {}

      // 2. Try Local Users Store
      if (!adminRecord) {
        const localUser = findStoredUserByEmail(cleanEmail);
        if (localUser && localUser.role === 'ADMIN') {
          const isValid = verifyPassword(password, localUser.passwordHash);
          if (isValid) {
            adminRecord = {
              id: localUser.id,
              email: localUser.email,
              role: 'ADMIN',
              membershipTier: localUser.membershipTier,
              fullName: localUser.profile?.fullName || 'Administrator',
              isVerified: localUser.isVerified
            };
          }
        }
      }
    }

    if (!adminRecord) {
      return NextResponse.json({ 
        error: 'Access Denied: Invalid Administrative Credentials or insufficient security clearance.' 
      }, { status: 403 });
    }

    // Generate signed Admin JWT Session Token
    const token = signJWT({
      userId: adminRecord.id,
      email: adminRecord.email,
      role: 'ADMIN',
      fullName: adminRecord.fullName,
      tier: 'ELITE'
    });

    const response = NextResponse.json({
      success: true,
      message: 'Administrative clearance verified. Accessing governance workspace.',
      redirectUrl: '/admin',
      adminUser: {
        id: adminRecord.id,
        email: adminRecord.email,
        fullName: adminRecord.fullName,
        role: 'ADMIN'
      }
    });

    response.headers.set(
      'Set-Cookie',
      `session-token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error during admin authentication' }, { status: 500 });
  }
}
