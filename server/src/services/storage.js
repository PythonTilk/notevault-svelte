import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local', 's3', 'cloudinary'

// AWS S3 Configuration
let s3Client = null;
if (STORAGE_TYPE === 's3' && process.env.AWS_ACCESS_KEY_ID) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Cloudinary Configuration
if (STORAGE_TYPE === 'cloudinary' && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

class StorageService {
  constructor() {
    this.type = STORAGE_TYPE;
    this.localStoragePath = path.join(__dirname, '../../uploads');
    
    // Ensure local storage directory exists
    if (this.type === 'local') {
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
    }
  }

  /**
   * Upload a file to the configured storage provider
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} mimeType - MIME type of the file
   * @param {string} folder - Optional folder/prefix
   * @returns {Promise<{url: string, key: string, size: number}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType, folder = '') {
    const timestamp = Date.now();
    const extension = path.extname(fileName);
    const safeName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9]/g, '_');
    const key = folder ? `${folder}/${timestamp}_${safeName}${extension}` : `${timestamp}_${safeName}${extension}`;

    try {
      switch (this.type) {
        case 's3':
          return await this.uploadToS3(fileBuffer, key, mimeType);
        case 'cloudinary':
          return await this.uploadToCloudinary(fileBuffer, key, mimeType);
        default:
          return await this.uploadLocal(fileBuffer, key, mimeType);
      }
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete a file from storage
   * @param {string} key - File key/path
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    try {
      switch (this.type) {
        case 's3':
          return await this.deleteFromS3(key);
        case 'cloudinary':
          return await this.deleteFromCloudinary(key);
        default:
          return await this.deleteLocal(key);
      }
    } catch (error) {
      console.error('Storage delete error:', error);
      return false;
    }
  }

  /**
   * Get a signed URL for a file (useful for private files)
   * @param {string} key - File key/path
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      switch (this.type) {
        case 's3':
          return await this.getS3SignedUrl(key, expiresIn);
        case 'cloudinary':
          return this.getCloudinaryUrl(key);
        default:
          return this.getLocalUrl(key);
      }
    } catch (error) {
      console.error('Storage signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  // S3 specific methods
  async uploadToS3(fileBuffer, key, mimeType) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    return {
      url,
      key,
      size: fileBuffer.length,
      provider: 's3'
    };
  }

  async deleteFromS3(key) {
    if (!s3Client) return false;

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  }

  async getS3SignedUrl(key, expiresIn) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  // Cloudinary specific methods
  async uploadToCloudinary(fileBuffer, key, mimeType) {
    return new Promise((resolve, reject) => {
      const resourceType = mimeType.startsWith('video/') ? 'video' : 
                          mimeType.startsWith('image/') ? 'image' : 'raw';

      cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          public_id: key,
          folder: 'notevault',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              key: result.public_id,
              size: result.bytes,
              provider: 'cloudinary'
            });
          }
        }
      ).end(fileBuffer);
    });
  }

  async deleteFromCloudinary(key) {
    return new Promise((resolve) => {
      cloudinary.uploader.destroy(key, (error, result) => {
        if (error) {
          console.error('Cloudinary delete error:', error);
          resolve(false);
        } else {
          resolve(result.result === 'ok');
        }
      });
    });
  }

  getCloudinaryUrl(key) {
    return cloudinary.url(key, { secure: true });
  }

  // Local storage methods
  async uploadLocal(fileBuffer, key, mimeType) {
    const filePath = path.join(this.localStoragePath, key);
    const directory = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(filePath, fileBuffer);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const url = `${baseUrl}/uploads/${key}`;

    return {
      url,
      key,
      size: fileBuffer.length,
      provider: 'local'
    };
  }

  async deleteLocal(key) {
    const filePath = path.join(this.localStoragePath, key);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    
    return false;
  }

  getLocalUrl(key) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    return `${baseUrl}/uploads/${key}`;
  }

  // Utility methods
  isImage(mimeType) {
    return mimeType.startsWith('image/');
  }

  isVideo(mimeType) {
    return mimeType.startsWith('video/');
  }

  isDocument(mimeType) {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    return documentTypes.includes(mimeType);
  }

  validateFile(file, maxSize = 10 * 1024 * 1024) { // 10MB default
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return errors;
    }

    if (file.size > maxSize) {
      errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
    }

    // Add more validation rules as needed
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Archives
      'application/zip', 'application/x-zip-compressed',
      // Video (basic support)
      'video/mp4', 'video/webm'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push('File type not supported');
    }

    return errors;
  }
}

// Export singleton instance
export default new StorageService();