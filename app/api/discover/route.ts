import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getAllStoredUsers } from '@/lib/usersStore';
import { calculateAge } from '@/lib/dateUtils';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');

    // 1. Fetch profiles with nested relations from PostgreSQL DB
    let queryOptions: any = {
      include: {
        photos: true,
        interests: true,
        user: true
      }
    };

    // Resolve all user IDs belonging to current session (by userId and email)
    const excludeIds = new Set<string>();
    if (session?.userId) excludeIds.add(session.userId);
    if (session?.email) {
      try {
        const matchingDbUsers = await prisma.user.findMany({
          where: {
            OR: [
              { email: { equals: session.email, mode: 'insensitive' } },
              ...(session.userId ? [{ id: session.userId }] : [])
            ]
          },
          select: { id: true }
        });
        matchingDbUsers.forEach(u => excludeIds.add(u.id));
      } catch {}
    }

    // Filter out current user and blocked profiles
    if (excludeIds.size > 0) {
      try {
        const blockRecords = await prisma.block.findMany({
          where: {
            OR: [
              { blockerId: { in: Array.from(excludeIds) } },
              { blockedUserId: { in: Array.from(excludeIds) } }
            ]
          },
          select: { blockerId: true, blockedUserId: true }
        });
        blockRecords.forEach(b => {
          if (excludeIds.has(b.blockerId)) excludeIds.add(b.blockedUserId);
          if (excludeIds.has(b.blockedUserId)) excludeIds.add(b.blockerId);
        });
      } catch {}

      queryOptions.where = {
        userId: { notIn: Array.from(excludeIds) }
      };
    }

    if (city && city !== 'All') {
      queryOptions.where = {
        ...queryOptions.where,
        location: { contains: city, mode: 'insensitive' }
      };
    }

    let dbProfiles: any[] = [];
    try {
      dbProfiles = await prisma.profile.findMany(queryOptions);
    } catch {
      dbProfiles = [];
    }

    const storedUsers = getAllStoredUsers();

    // 1. Format profiles from DB
    const formatted: any[] = (dbProfiles || [])
      .filter((p: any) => {
        if (excludeIds.has(p.userId)) return false;
        if (session?.email && p.user?.email && p.user.email.toLowerCase() === session.email.toLowerCase()) return false;
        return true;
      })
      .map((p: any) => {
        const storedMatch = storedUsers.find(u => 
          u.id === p.userId || 
          (p.user?.email && u.email.toLowerCase() === p.user.email.toLowerCase())
        );
        
        const storedPhotos = (storedMatch?.profile?.photos || []).filter((url: string) => url && !url.includes('unsplash.com') && url !== '/crown-gold.png');
        const dbPhotos = (p.photos && p.photos.length > 0 ? p.photos.map((ph: any) => ph.url) : []).filter((url: string) => url && !url.includes('unsplash.com') && url !== '/crown-gold.png');
        const finalPhotos = dbPhotos.length > 0 ? dbPhotos : storedPhotos;

        return {
          id: p.userId,
          name: p.customName || p.fullName || storedMatch?.profile?.customName || storedMatch?.profile?.fullName || 'Club Member',
          age: calculateAge(p.dob) || calculateAge(storedMatch?.profile?.dob) || 28,
          location: p.location || storedMatch?.profile?.location || 'Nigeria',
          occupation: p.occupation || storedMatch?.profile?.occupation || 'Executive Member',
          education: p.education || storedMatch?.profile?.education || 'Prestigious Institution',
          bio: p.bio || storedMatch?.profile?.bio || '',
          height: p.height || storedMatch?.profile?.height || "5'10\"",
          verified: p.verifiedBadge || storedMatch?.isVerified || false,
          tier: p.user?.membershipTier || storedMatch?.membershipTier || 'ESSENTIAL',
          compatibility: p.compatibilityScore || 92,
          relationshipGoals: p.relationshipGoals || storedMatch?.profile?.relationshipGoals || 'Exclusive Relationship',
          photos: finalPhotos,
          interests: p.interests && p.interests.length > 0 ? p.interests.map((i: any) => i.name) : (storedMatch?.profile?.interests || ['Fine Dining', 'Art & Culture']),
          online: true,
          distance: 'Within your preferred city'
        };
      });

    // 2. Include stored users not present in formatted
    storedUsers.forEach(u => {
      if (excludeIds.has(u.id)) return;
      if (session?.email && u.email && u.email.toLowerCase() === session.email.toLowerCase()) return;
      if (session?.userId && u.id === session.userId) return;

      const alreadyPresent = formatted.some(f => f.id === u.id || (u.email && f.id === u.email));
      if (!alreadyPresent) {
        if (city && city !== 'All' && !u.profile?.location?.toLowerCase().includes(city.toLowerCase())) return;

        const photos = (u.profile?.photos || []).filter((url: string) => url && !url.includes('unsplash.com') && url !== '/crown-gold.png');
        formatted.push({
          id: u.id,
          name: u.profile?.customName || u.profile?.fullName || 'Club Member',
          age: calculateAge(u.profile?.dob) || 28,
          location: u.profile?.location || 'Nigeria',
          occupation: u.profile?.occupation || 'Member',
          education: u.profile?.education || 'Verified Member',
          bio: u.profile?.bio || '',
          height: u.profile?.height || "5'10\"",
          verified: u.isVerified,
          tier: u.membershipTier || 'ESSENTIAL',
          compatibility: 95,
          relationshipGoals: u.profile?.relationshipGoals || 'Exclusive Relationship',
          photos,
          interests: u.profile?.interests && u.profile.interests.length > 0 ? u.profile.interests : ['Fine Dining', 'Travel'],
          online: true,
          distance: 'Nearby'
        });
      }
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      profiles: formatted
    });
  } catch (err: any) {
    const storedUsers = getAllStoredUsers();
    const formatted = storedUsers.map(u => {
      const photos = (u.profile?.photos || []).filter((url: string) => url && url !== '/crown-gold.png');
      return {
        id: u.id,
        name: u.profile?.customName || u.profile?.fullName || 'Club Member',
        age: calculateAge(u.profile?.dob) || 28,
        location: u.profile?.location || 'Nigeria',
        occupation: u.profile?.occupation || 'Member',
        education: u.profile?.education || 'Verified Member',
        bio: u.profile?.bio || '',
        height: u.profile?.height || "5'10\"",
        verified: u.isVerified,
        tier: u.membershipTier || 'ESSENTIAL',
        compatibility: 95,
        relationshipGoals: u.profile?.relationshipGoals || 'Exclusive Relationship',
        photos,
        interests: u.profile?.interests && u.profile.interests.length > 0 ? u.profile.interests : ['Fine Dining', 'Travel'],
        online: true,
        distance: 'Nearby'
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      profiles: formatted
    });
  }
}
