
import React from 'react';

interface LegalScreenProps {
  onAccept: () => void;
  onDecline: () => void;
}

const LegalScreen: React.FC<LegalScreenProps> = ({ onAccept, onDecline }) => {
  return (
    <div className="w-full max-w-lg bg-brand-card rounded-[32px] shadow-2xl p-6 sm:p-10 space-y-8 text-center border border-brand-border relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="flex justify-center items-center mb-6 relative">
        <div className="p-4 bg-white rounded-2xl shadow-inner">
          <img 
            src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" 
            alt="Aksa Doğalgaz Logo" 
            className="h-12 sm:h-16 object-contain"
          />
        </div>
      </div>
      
      <div className="space-y-4 relative">
        <h2 className="text-2xl sm:text-3xl font-black text-brand-text uppercase tracking-tight leading-none">
          Yasal Uyarı <br/>
          <span className="text-brand-accent">& Gizlilik Taahhüdü</span>
        </h2>
        <div className="h-1 w-20 bg-brand-accent mx-auto rounded-full"></div>
      </div>

      <p className="text-brand-text-muted text-left leading-relaxed text-sm sm:text-base font-medium bg-brand-bg p-6 rounded-2xl border border-brand-border/50">
        Program kapsamında tarafıma sunulan tüm bilgi ve verilerin gizli olduğunu, 
        bu bilgileri yalnızca belirlenen amaçlar doğrultusunda kullanacağımı, 
        üçüncü kişilerle paylaşmayacağımı ve farklı herhangi bir amaçla kullanmayacağımı 
        kabul, beyan ve taahhüt ederim.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 pt-4 relative">
        <button
          onClick={onAccept}
          className="w-full flex justify-center py-4 px-6 border border-transparent text-sm font-black rounded-2xl text-white bg-brand-accent hover:bg-brand-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-all shadow-lg shadow-brand-accent/20 uppercase tracking-widest"
        >
          Kabul Ediyorum
        </button>
        <button
          onClick={onDecline}
          className="w-full flex justify-center py-4 px-6 border border-brand-border text-sm font-black rounded-2xl text-brand-text-muted bg-brand-bg hover:bg-red-500 hover:text-white hover:border-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all uppercase tracking-widest"
        >
          Kabul Etmiyorum
        </button>
      </div>
    </div>
  );
};

export default LegalScreen;