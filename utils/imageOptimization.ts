/**
 * Image optimization utilities for inventory images
 * 
 * Note: Supabase Storage doesn't support built-in image transformations.
 * This utility provides helper functions for future integration with image
 * optimization services (e.g., Cloudinary, Imgix) or client-side optimization.
 * 
 * For now, we optimize through:
 * - Proper image attributes (width, height, decoding)
 * - Responsive images with srcset
 * - Lazy loading
 * - Appropriate sizing hints
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-100, default 80
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
}

/**
 * Generates optimized image dimensions for inventory card thumbnails
 * Cards display at h-48 (192px), optimized for ~400px width for retina displays
 */
export function getThumbnailDimensions(): { width: number; height: number } {
  return { width: 400, height: 300 };
}

/**
 * Generates optimized image dimensions for inventory modal/details view
 * Modal displays at h-96 (384px), optimized for ~800px width for retina displays
 */
export function getDetailImageDimensions(): { width: number; height: number } {
  return { width: 800, height: 600 };
}

/**
 * Generates a srcset for responsive images
 * Creates multiple size variants for different screen densities
 * 
 * Note: Currently returns the same URL for all sizes since Supabase
 * doesn't support transformations. In the future, this can be updated
 * to use an image optimization service.
 */
export function getImageSrcSet(
  imageUrl: string,
  baseWidth: number
): string {
  if (!imageUrl) return '';
  
  // For now, return a single srcset entry
  // In the future, this can be updated to use an image optimization service
  // that generates multiple sizes
  const sizes = [
    { width: baseWidth, multiplier: 1 },
    { width: Math.round(baseWidth * 1.5), multiplier: 1.5 },
    { width: baseWidth * 2, multiplier: 2 },
  ];

  return sizes
    .map(({ width, multiplier }) => {
      // For now, return the same URL with size hint
      // Future: integrate with image optimization service
      return `${imageUrl} ${multiplier}x`;
    })
    .join(', ');
}

/**
 * Gets the appropriate sizes attribute for responsive images
 */
export function getImageSizes(context: 'thumbnail' | 'detail'): string {
  if (context === 'thumbnail') {
    // For thumbnails: full width on mobile, fixed width on larger screens
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px';
  } else {
    // For detail view: full width on mobile, constrained on larger screens
    return '(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px';
  }
}

