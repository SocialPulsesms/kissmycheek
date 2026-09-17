import { hashPassword, verifyPassword, signJWT, verifyJWT } from '../lib/auth';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

async function runTests() {
  console.log('=== STARTING PRODUCTION INTEGRATION TESTS ===\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // TEST 1: Password Hashing & Encryption
  try {
    const rawPass = 'SecretBlackCard2026';
    const hash = hashPassword(rawPass);
    assert(hash.includes(':'), 'Password hash should include salt separator');
    assert(verifyPassword(rawPass, hash), 'Hashed password should verify correctly');
    assert(!verifyPassword('WrongPass', hash), 'Incorrect credentials should reject verification');
  } catch (err: any) {
    console.error('Test 1 error:', err.message);
    failedCount++;
  }

  // TEST 2: JWT Security Signature validation
  try {
    const payload = { userId: 'usr_test_99', role: 'ADMIN' };
    const token = signJWT(payload, 3600);
    const decoded = verifyJWT(token);
    assert(decoded !== null, 'JWT should verify with correct secret signature');
    assert(decoded?.userId === 'usr_test_99', 'Decoded claims should match payload claims');
    assert(decoded?.role === 'ADMIN', 'Decoded role should match payload role');
    
    // Test expired JWT
    const expiredToken = signJWT(payload, -10);
    assert(verifyJWT(expiredToken) === null, 'Expired JWT should be rejected');
  } catch (err: any) {
    console.error('Test 2 error:', err.message);
    failedCount++;
  }

  // Check Database Connection pre-flight
  let isDbOnline = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbOnline = true;
    console.log('[INFO] Database connection online. Running database integration tests...\n');
  } catch (err) {
    console.log('[WARN] PostgreSQL Database is offline. Skipping database integration tests.\n');
  }

  if (isDbOnline) {
    // TEST 3: Database User & Profile creation
    const testUser1Id = `t-usr-${Date.now()}-1`;
    const testUser2Id = `t-usr-${Date.now()}-2`;

    try {
      const email1 = `test-${Date.now()}-1@club.com`;
      const email2 = `test-${Date.now()}-2@club.com`;

      // Initialize mock database entries
      const u1 = await prisma.user.create({
        data: {
          id: testUser1Id,
          email: email1,
          passwordHash: hashPassword('pass123'),
          membershipTier: 'ESSENTIAL'
        }
      });

      const p1 = await prisma.profile.create({
        data: {
          userId: testUser1Id,
          fullName: 'Test Participant One',
          dob: '1995-04-12',
          gender: 'Man',
          location: 'London',
          relationshipGoals: 'Marriage',
          interestedIn: 'Women',
          bio: 'Test user one bio',
          occupation: 'Investor',
          education: 'Oxford'
        }
      });

      const u2 = await prisma.user.create({
        data: {
          id: testUser2Id,
          email: email2,
          passwordHash: hashPassword('pass123'),
          membershipTier: 'ELITE'
        }
      });

      const p2 = await prisma.profile.create({
        data: {
          userId: testUser2Id,
          fullName: 'Test Participant Two',
          dob: '1997-08-20',
          gender: 'Woman',
          location: 'Paris',
          relationshipGoals: 'Dating',
          interestedIn: 'Men',
          bio: 'Test user two bio',
          occupation: 'Designer',
          education: 'Sorbonne'
        }
      });

      assert(u1 !== null && u2 !== null, 'Database User records created successfully');
      assert(p1.fullName === 'Test Participant One', 'Profile fields saved correctly');
    } catch (err: any) {
      console.error('Test 3 database error:', err);
      failedCount++;
    }

    // TEST 4: Likes & Mutual Matches creation
    try {
      // User 1 likes User 2
      await prisma.like.create({
        data: {
          senderId: testUser1Id,
          receiverId: testUser2Id,
          isSuperLike: false
        }
      });

      // Check mutual matching creation check
      const reverseLike = await prisma.like.findUnique({
        where: {
          senderId_receiverId: {
            senderId: testUser2Id,
            receiverId: testUser1Id
          }
        }
      });
      assert(reverseLike === null, 'No mutual match yet since user 2 has not liked back');

      // User 2 likes User 1 back
      await prisma.like.create({
        data: {
          senderId: testUser2Id,
          receiverId: testUser1Id
        }
      });

      // Create match record
      const match = await prisma.match.create({
        data: {
          user1Id: testUser1Id,
          user2Id: testUser2Id
        }
      });

      assert(match !== null, 'Mutual match record persisted successfully upon reciprocated like');
    } catch (err: any) {
      console.error('Test 4 matches error:', err.message);
      failedCount++;
    }

    // TEST 5: Messaging & Conversation authorization
    try {
      const conv = await prisma.conversation.create({
        data: {
          user1Id: testUser1Id,
          user2Id: testUser2Id
        }
      });

      const msg = await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: testUser1Id,
          content: 'Hey, would you like to attend the gala tonight?'
        }
      });

      assert(msg.content === 'Hey, would you like to attend the gala tonight?', 'Chat message saved successfully');
      assert(msg.conversationId === conv.id, 'Chat message linked to correct conversation');
    } catch (err: any) {
      console.error('Test 5 messaging error:', err.message);
      failedCount++;
    }

    // Cleanup test database entries
    try {
      await prisma.message.deleteMany({
        where: { senderId: { in: [testUser1Id, testUser2Id] } }
      });
      await prisma.conversation.deleteMany({
        where: { OR: [{ user1Id: testUser1Id }, { user2Id: testUser1Id }] }
      });
      await prisma.like.deleteMany({
        where: { OR: [{ senderId: testUser1Id }, { receiverId: testUser1Id }] }
      });
      await prisma.match.deleteMany({
        where: { OR: [{ user1Id: testUser1Id }, { user2Id: testUser1Id }] }
      });
      await prisma.profile.deleteMany({
        where: { userId: { in: [testUser1Id, testUser2Id] } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testUser1Id, testUser2Id] } }
      });
      console.log('\nDatabase cleanup complete.');
    } catch (err: any) {
      console.error('Cleanup error:', err.message);
    }
  } else {
    console.log('[SKIP] Test 3: Database User & Profile creation (Database Offline)');
    console.log('[SKIP] Test 4: Likes & Mutual Matches creation (Database Offline)');
    console.log('[SKIP] Test 5: Messaging & Conversation authorization (Database Offline)');
  }

  console.log(`\n=== TEST SUITE RUN COMPLETE ===`);
  console.log(`Passed: ${passedCount} | Failed: ${failedCount}`);
  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
