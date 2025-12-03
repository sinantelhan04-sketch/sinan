
import React, { useEffect, useRef, useState } from 'react';
import { ADSENSE_PUBLISHER_ID, ADSENSE_SLOT_ID } from '../config';

interface AdBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

const AdBanner: React.FC<AdBannerProps> = ({ className, style }) => {
  const adInit = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Çift yüklemeyi ve hata durumunda tekrar denemeyi engelle
    if (adInit.current || error) return;

    // Config kontrolü
    if (!ADSENSE_PUBLISHER_ID || !ADSENSE_SLOT_ID || (ADSENSE_SLOT_ID as string) === "1234567890") {
        return; // Geçersiz veya varsayılan ID varsa yükleme yapma
    }
    
    try {
      // @ts-ignore
      if (window.adsbygoogle) {
        // @ts-ignore
        window.adsbygoogle.push({});
        adInit.current = true;
      }
    } catch (e) {
      console.error("AdSense Error:", e);
      setError(true);
    }
  }, [error]);

  // ID yapılandırılmamışsa veya varsayılan değerdeyse geliştirici uyarısı göster (sadece yerel ortamda görülebilir, production'da boş döner)
  if (!ADSENSE_PUBLISHER_ID || !ADSENSE_SLOT_ID || (ADSENSE_SLOT_ID as string) === "1234567890") {
    // Sadece geliştirme aşamasında yer tutucu göster, canlıda gizle
    if (process.env.NODE_ENV === 'development') {
        return (
            <div className={`w-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-24 flex flex-col items-center justify-center text-gray-400 text-xs p-4 text-center ${className || ''}`} style={style}>
                <span className="font-bold">Reklam Alanı</span>
                <span>Görünmesi için config.ts dosyasına <br/>geçerli bir ADSENSE_SLOT_ID girin.</span>
            </div>
        );
    }
    return null;
  }

  if (error) return null;

  return (
    <div className={`w-full flex flex-col items-center justify-center my-4 overflow-hidden print:hidden ${className || ''}`} style={style}>
      {/* "Reklam" etiketi yasal uyumluluk için önerilir */}
      <div className="text-[9px] text-gray-300 uppercase tracking-widest mb-1 select-none">Sponsorlu</div>
      
      <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center min-h-[100px] shadow-sm">
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
