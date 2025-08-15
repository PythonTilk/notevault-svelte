import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CDN Configuration
export const cdnConfig = {
  // CDN Provider settings
  provider: process.env.CDN_PROVIDER || 'cloudflare', // 'cloudflare', 'aws', 'fastly', 'local'
  
  // Base URLs for different environments
  baseUrls: {
    development: process.env.CDN_BASE_URL_DEV || 'http://localhost:5173',
    staging: process.env.CDN_BASE_URL_STAGING || 'https://staging-cdn.notevault.com',
    production: process.env.CDN_BASE_URL_PROD || 'https://cdn.notevault.com'
  },
  
  // Asset paths
  paths: {
    static: '/static',
    images: '/images',
    js: '/js',
    css: '/css',
    fonts: '/fonts',
    uploads: '/uploads',
    avatars: '/avatars',
    thumbnails: '/thumbnails'
  },
  
  // Cache settings
  cache: {
    // Static assets (JS, CSS, fonts) - long cache
    static: {
      maxAge: 31536000, // 1 year
      immutable: true,
      etag: true,
      lastModified: true
    },
    
    // Images - medium cache
    images: {
      maxAge: 2592000, // 30 days
      immutable: false,
      etag: true,
      lastModified: true
    },
    
    // User uploads - short cache
    uploads: {
      maxAge: 86400, // 1 day
      immutable: false,
      etag: true,
      lastModified: true
    },
    
    // API responses - very short cache
    api: {
      maxAge: 300, // 5 minutes
      immutable: false,
      etag: true,
      lastModified: false
    }
  },
  
  // Compression settings
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024, // Only compress files larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return true;
    }
  },
  
  // Image optimization
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif', 'jpeg', 'png'],
    quality: {
      webp: 80,
      avif: 75,
      jpeg: 85,
      png: 90
    },
    sizes: [150, 300, 600, 1200, 1800], // Responsive image sizes
    placeholder: {
      enabled: true,
      quality: 20,
      blur: 2
    }
  },
  
  // Security headers
  security: {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
      credentials: false,
      optionsSuccessStatus: 200
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  },
  
  // CDN Provider specific settings
  providers: {
    cloudflare: {
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      purgeCache: true,
      minify: {
        css: true,
        js: true,
        html: true
      },
      polish: 'lossless', // Image optimization
      mirage: true, // Accelerated mobile pages
      rocketLoader: false // Can break some apps
    },
    
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      distributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
      bucket: process.env.AWS_S3_CDN_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      invalidateCache: true
    },
    
    fastly: {
      serviceId: process.env.FASTLY_SERVICE_ID,
      apiToken: process.env.FASTLY_API_TOKEN,
      purgeCache: true,
      imageOptimization: true
    }
  },
  
  // Local development settings
  local: {
    staticPath: path.join(__dirname, '../../public'),
    uploadsPath: path.join(__dirname, '../../uploads'),
    enableHotReload: true,
    watchFiles: true
  }
};

// Get CDN URL for asset
export function getCDNUrl(assetPath, environment = process.env.NODE_ENV || 'development') {
  const baseUrl = cdnConfig.baseUrls[environment] || cdnConfig.baseUrls.development;
  
  // Remove leading slash from asset path
  const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
  
  return `${baseUrl}/${cleanPath}`;
}

// Get optimized image URL
export function getOptimizedImageUrl(imagePath, options = {}) {
  const {
    width,
    height,
    quality,
    format = 'webp',
    fit = 'cover'
  } = options;
  
  if (!cdnConfig.imageOptimization.enabled) {
    return getCDNUrl(imagePath);
  }
  
  const baseUrl = getCDNUrl(imagePath);
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());
  if (format) params.append('f', format);
  if (fit) params.append('fit', fit);
  
  return `${baseUrl}?${params.toString()}`;
}

// Get responsive image srcset
export function getResponsiveImageSrcset(imagePath, options = {}) {
  const { format = 'webp', quality } = options;
  
  return cdnConfig.imageOptimization.sizes
    .map(size => {
      const url = getOptimizedImageUrl(imagePath, {
        width: size,
        format,
        quality
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

// Cache headers middleware
export function getCacheHeaders(assetType) {
  const cacheConfig = cdnConfig.cache[assetType] || cdnConfig.cache.static;
  
  const headers = {
    'Cache-Control': `public, max-age=${cacheConfig.maxAge}${cacheConfig.immutable ? ', immutable' : ''}`
  };
  
  if (cacheConfig.etag) {
    headers['ETag'] = true;
  }
  
  return headers;
}

// Purge CDN cache
export async function purgeCDNCache(paths = [], provider = cdnConfig.provider) {
  try {
    switch (provider) {
      case 'cloudflare':
        await purgeCloudflareCache(paths);
        break;
      case 'aws':
        await purgeAWSCache(paths);
        break;
      case 'fastly':
        await purgeFastlyCache(paths);
        break;
      default:
        console.log('Local development - no CDN cache to purge');
    }
  } catch (error) {
    console.error('Failed to purge CDN cache:', error);
  }
}

// Cloudflare cache purging
async function purgeCloudflareCache(paths) {
  const config = cdnConfig.providers.cloudflare;
  if (!config.apiToken || !config.zoneId) {
    throw new Error('Cloudflare credentials not configured');
  }
  
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: paths.length > 0 ? paths : undefined,
      purge_everything: paths.length === 0
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(`Cloudflare purge failed: ${result.errors?.[0]?.message}`);
  }
  
  console.log('Cloudflare cache purged successfully');
}

// AWS CloudFront cache invalidation
async function purgeAWSCache(paths) {
  const AWS = await import('aws-sdk');
  const config = cdnConfig.providers.aws;
  
  const cloudfront = new AWS.CloudFront({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region
  });
  
  const params = {
    DistributionId: config.distributionId,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: paths.length || 1,
        Items: paths.length > 0 ? paths : ['/*']
      }
    }
  };
  
  await cloudfront.createInvalidation(params).promise();
  console.log('AWS CloudFront cache invalidated successfully');
}

// Fastly cache purging
async function purgeFastlyCache(paths) {
  const config = cdnConfig.providers.fastly;
  if (!config.apiToken || !config.serviceId) {
    throw new Error('Fastly credentials not configured');
  }
  
  if (paths.length === 0) {
    // Purge all
    const response = await fetch(`https://api.fastly.com/service/${config.serviceId}/purge_all`, {
      method: 'POST',
      headers: {
        'Fastly-Token': config.apiToken
      }
    });
    
    if (!response.ok) {
      throw new Error(`Fastly purge all failed: ${response.statusText}`);
    }
  } else {
    // Purge specific paths
    for (const path of paths) {
      const response = await fetch(`https://api.fastly.com/purge/${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: {
          'Fastly-Token': config.apiToken
        }
      });
      
      if (!response.ok) {
        throw new Error(`Fastly purge failed for ${path}: ${response.statusText}`);
      }
    }
  }
  
  console.log('Fastly cache purged successfully');
}

// Asset versioning for cache busting
export function getVersionedAssetUrl(assetPath, version = process.env.APP_VERSION || Date.now()) {
  const url = getCDNUrl(assetPath);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}

// Preload critical assets
export function generatePreloadLinks(criticalAssets = []) {
  return criticalAssets.map(asset => {
    const { href, as, type, crossorigin } = asset;
    const url = getCDNUrl(href);
    
    let link = `<link rel="preload" href="${url}" as="${as}"`;
    if (type) link += ` type="${type}"`;
    if (crossorigin) link += ` crossorigin="${crossorigin}"`;
    link += '>';
    
    return link;
  }).join('\n');
}

export default cdnConfig;