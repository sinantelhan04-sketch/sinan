import React, { useEffect, useRef } from 'react';
import { ADSENSE_PUBLISHER_ID, ADSENSE_SLOT_ID } from '../config';

interface AdBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

const AdBanner: React.FC<AdBannerProps> = ({ className, style }) => {
  const adInit = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (adInit.current) return;
    
    try {
      if (ADSENSE_PUBLISHER_ID && ADSENSE_SLOT_ID) {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adInit.current = true;
      }
    } catch (e) {
      console.error("AdSense Error:", e);
    }
  }, []);

  if (!ADSENSE_PUBLISHER_ID || !ADSENSE_SLOT_ID) {
    return null;
  }

  return (
    <div className={`w-full flex flex-col items-center justify-center my-4 overflow-hidden ${className || ''}`} style={style}>
      <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Reklam</div>
      <div className="w-full bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-lg overflow-hidden min-h-[90px] flex items-center justify-center">
         <ins className="adsbygoogle"
              style={{ display: 'block', width: '100%' }}
              data-ad-client={ADSENSE_PUBLISHER_ID}
              data-ad-slot={ADSENSE_SLOT_ID}
              data-ad-format="auto"
              data-full-width-responsive="true"></ins>
      </div>
    </div>
  );
};

export default AdBanner;