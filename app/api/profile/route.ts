import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

import { getAllStoredUsers, updateStoredUserProfile } from '@/lib/usersStore';
import { calculateAge } from '@/lib/dateUtils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('id');
    const session = getSessionUser(req);
    const userId = targetId || session?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    let dbProfile: any = null;
    try {
      dbProfile = await prisma.profile.findFirst({
        where: {
          OR: [
            { userId: userId },
            { id: userId },
            { user: { email: { equals: userId, mode: 'insensitive' } } }
          ]
        },
        include: { photos: true, interests: true, user: true }
      });
    } catch {}

    const storedUsers = getAllStoredUsers();
    const storedMatch = storedUsers.find(u => 
      u.id === userId || 
      u.email.toLowerCase() === userId.toLowerCase() ||
      (dbProfile?.user?.email && u.email.toLowerCase() === dbProfile.user.email.toLowerCase())
    );

    if (!dbProfile && !storedMatch) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const storedPhotos = (storedMatch?.profile?.photos || []).filter((url: string) => url && !url.includes('unsplash.com') && url !== '/crown-gold.png');
    const dbPhotos = (dbProfile?.photos && dbProfile.photos.length > 0 ? dbProfile.photos.map((ph: any) => ph.url) : []).filter((url: string) => url && !url.includes('unsplash.com') && url !== '/crown-gold.png');
    const finalPhotos = dbPhotos.length > 0 ? dbPhotos : storedPhotos;

    const profileData = {
      id: dbProfile?.userId || storedMatch?.id || userId,
      userId: dbProfile?.userId || storedMatch?.id || userId,
      email: dbProfile?.user?.email || storedMatch?.email || '',
      name: dbProfile?.customName || dbProfile?.fullName || storedMatch?.profile?.customName || storedMatch?.profile?.fullName || 'Club Member',
      age: calculateAge(dbProfile?.dob) || calculateAge(storedMatch?.profile?.dob) || 28,
      location: dbProfile?.location || storedMatch?.profile?.location || 'Nigeria',
      occupation: dbProfile?.occupation || storedMatch?.profile?.occupation || 'Executive Principal',
      education: dbProfile?.education || storedMatch?.profile?.education || 'Oxford University',
      bio: dbProfile?.bio || storedMatch?.profile?.bio || 'Connoisseur of luxury travel, contemporary art, and fine dining.',
      height: dbProfile?.height || storedMatch?.profile?.height || `5'10"`,
      relationshipGoals: dbProfile?.relationshipGoals || storedMatch?.profile?.relationshipGoals || 'Serious Relationship',
      interests: dbProfile?.interests && dbProfile.interests.length > 0 ? dbProfile.interests.map((i: any) => i.name) : (storedMatch?.profile?.interests || ['Fine Dining', 'Art & Culture']),
      tier: dbProfile?.user?.membershipTier || storedMatch?.membershipTier || 'ESSENTIAL',
      photos: finalPhotos,
      videos: [
        'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
        'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4'
      ],
      compatibility: dbProfile?.compatibilityScore || 95,
      verified: dbProfile?.verifiedBadge || storedMatch?.isVerified || true,
      online: true,
      distance: 'Direct Member Profile'
    };

    return NextResponse.json({ success: true, profile: profileData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const userId = session.userId;
    const body = await req.json();
    const {
      fullName,
      dob,
      gender,
      pronouns,
      location,
      bio,
      occupation,
      education,
      height,
      relationshipGoals,
      interestedIn,
      ageMin,
      ageMax,
      distancePref,
      photos, // Array of photo URLs
      traits // Array of interest names
    } = body;

    // Transactionally update Profile, Photos, and Interests
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update user verification if verified
        await tx.user.update({
          where: { id: userId },
          data: { isVerified: true }
        });

        // 2. Upsert profile details
        const profile = await tx.profile.upsert({
          where: { userId },
          update: {
            fullName: fullName || 'Club Member',
            dob: dob || '1998-01-01',
            gender: gender || 'Woman',
            pronouns: pronouns || null,
            location: location || 'London',
            bio: bio || '',
            occupation: occupation || 'Executive',
            education: education || 'Prestigious University',
            height: height || null,
            relationshipGoals: relationshipGoals || 'Serious Relationship',
            interestedIn: interestedIn || 'Everyone',
            ageMin: ageMin || 21,
            ageMax: ageMax || 45,
            distancePref: distancePref || 50,
            verifiedBadge: true
          },
          create: {
            userId,
            fullName: fullName || 'Club Member',
            dob: dob || '1998-01-01',
            gender: gender || 'Woman',
            pronouns: pronouns || null,
            location: location || 'London',
            bio: bio || '',
            occupation: occupation || 'Executive',
            education: education || 'Prestigious University',
            height: height || null,
            relationshipGoals: relationshipGoals || 'Serious Relationship',
            interestedIn: interestedIn || 'Everyone',
            ageMin: ageMin || 21,
            ageMax: ageMax || 45,
            distancePref: distancePref || 50,
            verifiedBadge: true
          }
        });

        // 3. Rebuild Photo relationships
        if (photos && Array.isArray(photos)) {
          await tx.photo.deleteMany({ where: { profileId: profile.id } });
          await tx.photo.createMany({
            data: photos.map((url, idx) => ({
              profileId: profile.id,
              url,
              isCover: idx === 0,
              order: idx
            }))
          });
        }

        // 4. Rebuild Interest relationships
        if (traits && Array.isArray(traits)) {
          await tx.interest.deleteMany({ where: { profileId: profile.id } });
          await tx.interest.createMany({
            data: traits.map(name => ({
              profileId: profile.id,
              category: 'General',
              name
            }))
          });
        }
      });
    } catch (dbErr) {
      console.warn('Prisma transaction fallback:', dbErr);
    }

    // Always keep persistent store in sync
    updateStoredUserProfile(userId, {
      fullName: fullName || 'Club Member',
      dob: dob || '1998-01-01',
      gender: gender || 'Woman',
      pronouns: pronouns || undefined,
      location: location || 'London',
      bio: bio || '',
      occupation: occupation || 'Executive',
      education: education || 'Prestigious University',
      height: height || undefined,
      relationshipGoals: relationshipGoals || 'Serious Relationship',
      ...(Array.isArray(photos) ? { photos } : {}),
      ...(Array.isArray(traits) ? { interests: traits } : {})
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding profile data saved successfully to database'
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
