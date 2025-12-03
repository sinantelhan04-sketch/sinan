import React, { useEffect, useRef, useState } from 'react';
import { ADSENSE_PUBLISHER_ID, ADSENSE_SLOT_ID } from '../config';

interface AdBannerProps {
  slotId?: string; // AdSense reklam birimi ID'si (Opsiyonel, verilmezse config'den alır)
  format?: 'auto' | 'fluid' | 'rectangle';
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ slotId, format = 'auto', className = '' }) => {
  // Localhost'ta reklamlar görünmez, ancak production'da görünmesi için true yapıyoruz.
  const isProduction = true; 
  const adRef = useRef<HTMLDivElement>(null);
  const [isAdPushed, setIsAdPushed] = useState(false);
  
  // Eğer prop olarak slotId gelmediyse config dosyasındaki varsayılan ID'yi kullan
  const finalSlotId = slotId || ADSENSE_SLOT_ID;

  useEffect(() => {
    if (!isProduction || isAdPushed) return;

    const pushAd = () => {
        try {
            // Elementin genişliği 0 ise (gizliyse veya render edilmediyse) AdSense hata verir.
            // Bu yüzden genişlik kontrolü yapıyoruz.
            if (adRef.current && adRef.current.offsetWidth > 0) {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setIsAdPushed(true);
            }
        } catch (e) {
            // Hata olsa bile konsolu kirletmemek için sessizce geçilebilir veya loglanabilir
            console.error("AdSense push error ignored:", e);
        }
    };

    // İlk deneme: DOM yerleşimi için 500ms bekle
    const timer1 = setTimeout(pushAd, 500);
    
    // İkinci deneme: Eğer ilkinde genişlik 0 ise biraz daha bekle (örn: animasyonlar için)
    const timer2 = setTimeout(() => {
        if (!isAdPushed) pushAd();
    }, 2000);

    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
    };
  }, [isProduction, isAdPushed, finalSlotId]);

  if (!isProduction) {
    // TEST MODU GÖRÜNÜMÜ
    return (
      <div className={`w-full my-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center transition-all hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group ${className}`}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-blue-500">Sponsorlu Alan</p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">Reklamlar Burada Gösterilecek</p>
        <p className="text-[10px] text-gray-400 mt-1">ID: {finalSlotId}</p>
      </div>
    );
  }

  return (
    <div 
        ref={adRef}
        className={`w-full my-4 flex justify-center overflow-hidden rounded-xl shadow-sm min-h-[100px] bg-gray-50 dark:bg-gray-800/20 ${className}`}
    >
        {/* Google AdSense Kodu */}
        <ins className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client={ADSENSE_PUBLISHER_ID}
            data-ad-slot={finalSlotId}
            data-ad-format={format}
            data-full-width-responsive="true"></ins>
    </div>
  );
};

export default AdBanner;