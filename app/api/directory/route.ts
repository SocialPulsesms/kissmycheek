import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { getAllStoredUsers } from '@/lib/usersStore';
import { calculateAge } from '@/lib/dateUtils';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    const tier = searchParams.get('tier');
    const city = searchParams.get('city');

    const whereClause: any = {};

    if (tier && tier !== 'ALL') {
      whereClause.user = {
        membershipTier: tier
      };
    }

    if (city && city !== 'ALL') {
      whereClause.location = {
        contains: city,
        mode: 'insensitive'
      };
    }

    if (query) {
      whereClause.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { customName: { contains: query, mode: 'insensitive' } },
        { occupation: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } }
      ];
    }

    // Resolve all IDs belonging to current user
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

    if (excludeIds.size > 0) {
      whereClause.userId = {
        notIn: Array.from(excludeIds)
      };
    }

    let dbProfiles: any[] = [];
    try {
      dbProfiles = await prisma.profile.findMany({
        where: whereClause,
        include: {
          photos: true,
          interests: true,
          user: true
        }
      });
    } catch {
      dbProfiles = [];
    }

    const storedUsers = getAllStoredUsers();

    const formatted: any[] = (dbProfiles || [])
      .filter((p: any) => {
        if (excludeIds.has(p.userId)) return false;
        if (session?.email && p.user?.email && p.user.email.toLowerCase() === session.email.toLowerCase()) return false;
        return true;
      })
      .map(p => {
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
          occupation: p.occupation || storedMatch?.profile?.occupation || 'Member',
          education: p.education || storedMatch?.profile?.education || 'Prestigious University',
          bio: p.bio || storedMatch?.profile?.bio || '',
          height: p.height || storedMatch?.profile?.height || "5'10\"",
          verified: p.verifiedBadge || storedMatch?.isVerified || false,
          tier: p.user?.membershipTier || storedMatch?.membershipTier || 'ESSENTIAL',
          compatibility: p.compatibilityScore || 92,
          relationshipGoals: p.relationshipGoals || storedMatch?.profile?.relationshipGoals || 'Exclusive Relationship',
          photos: finalPhotos,
          interests: p.interests && p.interests.length > 0 ? p.interests.map((i: any) => i.name) : (storedMatch?.profile?.interests || ['Fine Dining', 'Art & Culture']),
          online: true,
          distance: 'Local'
        };
      });

    // Also include any stored users that are not already in formatted
    storedUsers.forEach(u => {
      if (excludeIds.has(u.id)) return;
      if (session?.email && u.email && u.email.toLowerCase() === session.email.toLowerCase()) return;
      if (session?.userId && u.id === session.userId) return;

      const alreadyPresent = formatted.some(f => f.id === u.id || (u.email && f.id === u.email));
      if (!alreadyPresent) {
        if (tier && tier !== 'ALL' && u.membershipTier !== tier) return;
        if (city && city !== 'ALL' && city !== 'All' && !u.profile?.location?.toLowerCase().includes(city.toLowerCase())) return;
        if (query) {
          const matchQuery = u.profile?.fullName?.toLowerCase().includes(query) ||
            u.profile?.occupation?.toLowerCase().includes(query) ||
            u.profile?.bio?.toLowerCase().includes(query);
          if (!matchQuery) return;
        }

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
          distance: 'Local'
        });
      }
    });

    return NextResponse.json({
      success: true,
      profiles: formatted,
      totalCount: formatted.length
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
        distance: 'Local'
      };
    });

    return NextResponse.json({
      success: true,
      profiles: formatted,
      totalCount: formatted.length
    });
  }
}
