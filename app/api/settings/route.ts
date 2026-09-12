import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { updateStoredUserProfile } from '@/lib/usersStore';

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const userId = session.userId;
    const body = await req.json();
    const { 
      incognitoMode, customName, dob, gender, pronouns, location, 
      occupation, education, bio, height, relationshipGoals, interestedIn, 
      interests, photos, email, password, phone 
    } = body;

    const updateUserData: any = {};
    if (incognitoMode !== undefined) {
      updateUserData.incognitoMode = incognitoMode;
    }
    if (password) {
      updateUserData.passwordHash = hashPassword(password);
    }
    if (email) {
      updateUserData.email = email.toLowerCase();
    }

    const updateProfileData: any = {};
    if (customName !== undefined) updateProfileData.customName = customName;
    if (dob !== undefined) updateProfileData.dob = dob;
    if (gender !== undefined) updateProfileData.gender = gender;
    if (pronouns !== undefined) updateProfileData.pronouns = pronouns;
    if (location !== undefined) updateProfileData.location = location;
    if (occupation !== undefined) updateProfileData.occupation = occupation;
    if (education !== undefined) updateProfileData.education = education;
    if (bio !== undefined) updateProfileData.bio = bio;
    if (height !== undefined) updateProfileData.height = height;
    if (relationshipGoals !== undefined) updateProfileData.relationshipGoals = relationshipGoals;
    if (interestedIn !== undefined) updateProfileData.interestedIn = interestedIn;

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update user settings/credentials
        if (Object.keys(updateUserData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: updateUserData
          });
        }

        // 2. Update profile fields (Full Name is preserved/locked for KYC)
        if (Object.keys(updateProfileData).length > 0) {
          await tx.profile.update({
            where: { userId },
            data: updateProfileData
          });
        }

        // 3. Update interests if provided
        if (Array.isArray(interests)) {
          const userProfile = await tx.profile.findUnique({ where: { userId } });
          if (userProfile) {
            await tx.interest.deleteMany({ where: { profileId: userProfile.id } });
            if (interests.length > 0) {
              await tx.interest.createMany({
                data: interests.map((name: string) => ({
                  profileId: userProfile.id,
                  name,
                  category: 'Lifestyle'
                }))
              });
            }
          }
        }

        // 4. Update photos if provided
        if (Array.isArray(photos)) {
          const userProfile = await tx.profile.findUnique({ where: { userId } });
          if (userProfile) {
            await tx.photo.deleteMany({ where: { profileId: userProfile.id } });
            if (photos.length > 0) {
              await tx.photo.createMany({
                data: photos.map((url: string, idx: number) => ({
                  profileId: userProfile.id,
                  url,
                  order: idx,
                  isCover: idx === 0
                }))
              });
            }
          }
        }
      });
    } catch (dbErr) {
      // Postgres offline fallback
    }

    // Always keep persistent store in sync
    const cleanPhotos = Array.isArray(photos) 
      ? photos.filter((u: string) => u && u !== '/crown-gold.png')
      : undefined;

    updateStoredUserProfile(userId, {
      ...updateProfileData,
      ...(cleanPhotos !== undefined ? { photos: cleanPhotos } : {}),
      ...(Array.isArray(interests) ? { interests } : {})
    });

    if (session.email) {
      updateStoredUserProfile(session.email, {
        ...updateProfileData,
        ...(cleanPhotos !== undefined ? { photos: cleanPhotos } : {}),
        ...(Array.isArray(interests) ? { interests } : {})
      });
    }

    if (email && email !== session.email) {
      updateStoredUserProfile(email, {
        ...updateProfileData,
        ...(cleanPhotos !== undefined ? { photos: cleanPhotos } : {}),
        ...(Array.isArray(interests) ? { interests } : {})
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile and account settings updated successfully'
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
