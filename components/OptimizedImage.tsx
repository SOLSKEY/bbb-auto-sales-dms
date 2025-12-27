import React, { useState, useRef, useEffect } from 'react';
import { getImageSrcSet, getImageSizes, getThumbnailDimensions, getDetailImageDimensions } from '../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  context: 'thumbnail' | 'detail';
  className?: string;
  objectFit?: 'cover' | 'contain';
  onError?: () => void;
}

/**
 * OptimizedImage component that handles image optimization and performance
 * - Uses proper dimensions to prevent layout shift
 * - Implements responsive images with srcset
 * - Adds async decoding for better performance
 * - Handles loading states and errors gracefully
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  context,
  className = '',
  objectFit = 'cover',
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const dimensions = context === 'thumbnail' 
    ? getThumbnailDimensions() 
    : getDetailImageDimensions();

  const sizes = getImageSizes(context);
  const srcset = getImageSrcSet(src, dimensions.width);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError || !src) {
    return (
      <div className={`${className} bg-glass-panel flex items-center justify-center`}>
        <div className="text-muted text-sm">Image unavailable</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 bg-glass-panel animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        srcSet={srcset}
        sizes={sizes}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ objectFit }}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

