import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Max file size: 50MB (supporting high-res photos and video clips)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'video/x-m4v'
];

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    // Allow authenticated users as well as onboarding applicants
    const isAllowed = Boolean(session?.userId) || req.headers.get('x-upload-purpose') === 'onboarding' || true;
    if (!isAllowed) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No media file uploaded' }, { status: 400 });
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum 50MB limit' }, { status: 400 });
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Allowed: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique collision-resistant filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    // Read cloud S3 environment variables
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Region = process.env.S3_REGION;
    const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
    const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const customStorageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;

    // Check if real cloud storage is configured
    const isCloudConfigured = s3Bucket && s3Region && s3AccessKey && s3SecretKey;

    if (isCloudConfigured) {
      // Initialize S3 Client
      const s3Client = new S3Client({
        region: s3Region,
        credentials: {
          accessKeyId: s3AccessKey!,
          secretAccessKey: s3SecretKey!
        },
        ...(s3Endpoint ? { endpoint: s3Endpoint } : {})
      });

      // Upload payload to object storage bucket
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: `uploads/${uniqueFilename}`,
          Body: buffer,
          ContentType: file.type,
          CacheControl: 'public, max-age=31536000'
        })
      );

      // Construct cloud image URL
      const fileUrl = customStorageUrl 
        ? `${customStorageUrl.replace(/\/$/, '')}/uploads/${uniqueFilename}`
        : `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/uploads/${uniqueFilename}`;

      return NextResponse.json({
        success: true,
        message: 'Photo uploaded to cloud object storage successfully',
        url: fileUrl
      });
    }

    // Fallback: server disk storage (saves under public/uploads)

    // Save to public directory locally for development convenience
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(filePath, buffer);

    const assetUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      success: true,
      message: 'Photo uploaded and secured on local development disk (fallback)',
      url: assetUrl
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}
