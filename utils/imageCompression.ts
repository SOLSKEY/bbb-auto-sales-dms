/**
 * Client-side image compression utilities
 * Compresses images before upload to reduce file size and improve performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, default 0.8
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
  maintainAspectRatio?: boolean;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'image/jpeg',
  maintainAspectRatio: true,
};

/**
 * Compresses an image file using canvas
 * Returns a Promise that resolves to a compressed Blob
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (opts.maintainAspectRatio) {
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const ratio = Math.min(
              opts.maxWidth / width,
              opts.maxHeight / height
            );
            width = width * ratio;
            height = height * ratio;
          }
        } else {
          width = Math.min(width, opts.maxWidth);
          height = Math.min(height, opts.maxHeight);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image to canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified format and quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          opts.format,
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image file and returns it as a File object
 */
export async function compressImageToFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const blob = await compressImage(file, options);
  
  // Determine file extension based on format
  const format = options.format || DEFAULT_OPTIONS.format;
  const extension = format === 'image/webp' ? 'webp' : 
                   format === 'image/png' ? 'png' : 'jpg';
  
  const fileName = file.name.replace(/\.[^/.]+$/, '') + '.' + extension;
  
  return new File([blob], fileName, {
    type: format,
    lastModified: Date.now(),
  });
}

/**
 * Compresses images for inventory thumbnails
 * Optimized for card display (400x300px)
 */
export async function compressForThumbnail(file: File): Promise<File> {
  return compressImageToFile(file, {
    maxWidth: 400,
    maxHeight: 300,
    quality: 0.75,
    format: 'image/jpeg',
    maintainAspectRatio: true,
  });
}

/**
 * Compresses images for detail view
 * Optimized for modal display (800x600px)
 */
export async function compressForDetail(file: File): Promise<File> {
  return compressImageToFile(file, {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.85,
    format: 'image/jpeg',
    maintainAspectRatio: true,
  });
}

/**
 * Gets the estimated file size reduction percentage
 */
export async function getCompressionEstimate(
  file: File,
  options: CompressionOptions = {}
): Promise<{ originalSize: number; estimatedSize: number; reductionPercent: number }> {
  const originalSize = file.size;
  
  try {
    const compressed = await compressImage(file, options);
    const estimatedSize = compressed.size;
    const reductionPercent = ((originalSize - estimatedSize) / originalSize) * 100;
    
    return {
      originalSize,
      estimatedSize,
      reductionPercent: Math.round(reductionPercent),
    };
  } catch (error) {
    console.error('Failed to estimate compression:', error);
    return {
      originalSize,
      estimatedSize: originalSize,
      reductionPercent: 0,
    };
  }
}

