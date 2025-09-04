import React, { useState } from 'react';

interface FaviconProps {
  domain: string;
  size?: number;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const Favicon: React.FC<FaviconProps> = ({
  domain,
  size = 16,
  className = '',
  fallbackIcon,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageSrc, setCurrentImageSrc] = useState(0);

  // Clean domain to remove protocol and www
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  // Request a higher resolution favicon and scale it down for better quality
  const requestedSize = Math.max(size * 2, 32); // Request at least 32px for better quality
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${requestedSize}`;

  // Alternative favicon services for better quality
  const alternativeFaviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;

  // Array of favicon sources to try
  const faviconSources = [googleFaviconUrl, alternativeFaviconUrl];

  const handleImageError = () => {
    if (currentImageSrc < faviconSources.length - 1) {
      // Try the next favicon source
      setCurrentImageSrc(currentImageSrc + 1);
    } else {
      // All sources failed
      setImageError(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (imageError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 rounded ${className}`}
        style={{ width: size, height: size }}
      >
        {fallbackIcon || (
          <svg
            width={size * 0.6}
            height={size * 0.6}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-400"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded animate-pulse"
          style={{ width: size, height: size }}
        >
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
      )}
      <img
        src={faviconSources[currentImageSrc]}
        alt={`${cleanDomain} favicon`}
        className={`rounded ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200`}
        style={{
          width: size,
          height: size,
          imageRendering: '-webkit-optimize-contrast',
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
};

export default Favicon;
