
import React from 'react';
import { ClockIcon } from './icons';

const OfflineScreen: React.FC = () => {
    return (
        <div className="w-full max-w-md flex flex-col items-center gap-6 animate-fade-in">
            <div className="text-center bg-brand-card p-10 rounded-[32px] shadow-2xl w-full border border-brand-border relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent/30"></div>
                
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-brand-bg rounded-full border border-brand-border text-brand-accent animate-pulse">
                        <ClockIcon />
                    </div>
                </div>
                
                <h2 className="text-3xl font-black text-brand-text uppercase tracking-tight mb-6">
                    Sistem <span className="text-brand-accent">Çevrimdışı</span>
                </h2>
                
                <div className="text-brand-text-muted text-left space-y-4 bg-brand-bg p-6 rounded-2xl border border-brand-border/50">
                    <p className="font-bold text-brand-text text-center mb-4 border-b border-brand-border pb-4">Tesisat Sorgulama sistemi şu anda kullanıma kapalıdır.</p>
                    
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-accent/70">Erişim Kuralları</p>
                        <ul className="space-y-3 text-sm font-medium">
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0"></span>
                                <span>Hizmet süresi her ayın <strong className="text-brand-text">1'i ile 20'si</strong> arasındadır.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0"></span>
                                <span>Çalışma saatleri hafta içi <strong className="text-brand-text">08:00 - 18:00</strong> arasındadır.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0"></span>
                                <span>Hafta sonları ve resmi tatillerde hizmet verilmemektedir.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OfflineScreen;