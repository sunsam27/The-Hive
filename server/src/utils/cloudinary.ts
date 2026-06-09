import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  publicId?: string,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'auto',
        transformation: { quality: 'auto', fetch_format: 'auto' },
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFile(secureUrl: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;

  const parts = secureUrl.split('/');
  const folderAndId = parts.slice(-2).join('/').replace(/\.[^.]+$/, '');
  const publicId = folderAndId.replace(/\.[^.]+$/, '');

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // ignore — file may not exist
  }
}
