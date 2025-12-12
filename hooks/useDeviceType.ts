import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

/**
 * Hook to detect the current device type based on viewport width
 * Breakpoints:
 * - mobile: < 768px
 * - tablet: 768px - 1024px
 * - desktop: >= 1024px
 */
export function useDeviceType(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const deviceType: DeviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      width,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const deviceType: DeviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

      setDeviceInfo({
        deviceType,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        width,
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call once to set initial value
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
}
