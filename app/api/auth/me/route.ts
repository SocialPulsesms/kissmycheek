import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getAllStoredUsers } from '@/lib/usersStore';
import { calculateAge } from '@/lib/dateUtils';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false });
    }

    let userRecord: any = null;
    try {
      userRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { id: session.userId },
            ...(session.email ? [{ email: { equals: session.email, mode: 'insensitive' as const } }] : [])
          ]
        },
        include: {
          profile: {
            include: {
              photos: true,
              interests: true
            }
          }
        }
      });
    } catch (err) {
      // Prisma offline, fallback to local users store
    }

    if (!userRecord) {
      const localUsers = getAllStoredUsers();
      userRecord = localUsers.find(u => 
        u.id === session.userId || 
        (session.email && u.email.toLowerCase() === session.email.toLowerCase())
      ) || null;
    }

    if (userRecord) {
      const profile = userRecord.profile;
      const dob = profile?.dob || '1998-01-01';
      const age = calculateAge(dob);
      const photoUrls = (profile?.photos?.map((p: any) => typeof p === 'string' ? p : p.url) || [])
        .filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
      const interestNames = profile?.interests?.map((i: any) => typeof i === 'string' ? i : i.name) || [];

      const storedUsers = getAllStoredUsers();
      const storedMatch = storedUsers.find(u => u.id === userRecord.id || (userRecord.email && u.email.toLowerCase() === userRecord.email.toLowerCase()));
      const storedPhotos = (storedMatch?.profile?.photos || [])
        .filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
      const resolvedPhotos = photoUrls.length > 0 ? photoUrls : storedPhotos;

      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
          membershipTier: userRecord.membershipTier,
          isVerified: userRecord.isVerified,
          fullName: profile?.fullName || session.fullName || 'Club Member',
          customName: profile?.customName || profile?.fullName || session.fullName || 'Club Member',
          profile: {
            fullName: profile?.fullName || session.fullName || 'Club Member',
            customName: profile?.customName || profile?.fullName || session.fullName || 'Club Member',
            dob,
            age,
            gender: profile?.gender || 'Woman',
            pronouns: profile?.pronouns || 'she/her',
            location: profile?.location || 'Lagos, Nigeria',
            occupation: profile?.occupation || 'Executive Member',
            education: profile?.education || 'Alumni',
            bio: profile?.bio || '',
            height: profile?.height || `5'8" (173 cm)`,
            relationshipGoals: profile?.relationshipGoals || 'Exclusive Relationship',
            interestedIn: profile?.interestedIn || 'Everyone',
            interests: interestNames,
            photos: resolvedPhotos
          }
        }
      });

      // If session ID was out of sync with DB, refresh token
      if (session.userId !== userRecord.id) {
        const { signJWT } = await import('@/lib/auth');
        const refreshedToken = signJWT({
          userId: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
          fullName: profile?.fullName || session.fullName || 'Club Member',
          tier: userRecord.membershipTier || 'ESSENTIAL'
        });
        response.headers.set(
          'Set-Cookie',
          `session-token=${encodeURIComponent(refreshedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
        );
      }

      return response;
    }

    // Fall back to decoded valid JWT session payload
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        role: session.role || 'MEMBER',
        membershipTier: session.tier || 'ESSENTIAL',
        isVerified: false,
        fullName: session.fullName || 'Club Member',
        customName: session.fullName || 'Club Member',
        profile: {
          fullName: session.fullName || 'Club Member',
          customName: session.fullName || 'Club Member',
          dob: '1998-01-01',
          age: 28,
          location: 'Lagos, Nigeria',
          occupation: 'VIP Member',
          education: 'Alumni',
          bio: '',
          height: `5'8"`,
          relationshipGoals: 'Exclusive Relationship',
          interests: [],
          photos: []
        }
      }
    });

  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message });
  }
}
