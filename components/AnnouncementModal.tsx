
import React from 'react';
import { Megaphone, CheckCircle2, X } from 'lucide-react';

interface AnnouncementModalProps {
    title: string;
    content: string;
    imageUrl?: string | null;
    onDismiss: () => void;
    isPreview?: boolean;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ title, content, imageUrl, onDismiss, isPreview }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-brand-border w-full max-w-lg rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col max-h-[90vh] animate-soft-slide-up relative">
                
                {/* Header Pattern */}
                <div className="h-32 bg-brand-accent relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full transform -translate-x-12 translate-y-12"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md border border-white/30 shadow-xl">
                            <Megaphone size={40} className="text-white" />
                         </div>
                    </div>
                    {isPreview && (
                        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow border border-white/20 tracking-widest uppercase">ÖNİZLEME MODU</div>
                    )}
                    <button 
                        onClick={onDismiss}
                        className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-8 sm:p-10 overflow-y-auto flex-grow custom-scrollbar bg-gradient-to-b from-brand-bg/30 to-white">
                    <div className="text-center space-y-2 mb-8">
                        <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.3em]">Sistem Duyurusu</p>
                        <h2 className="text-2xl font-black text-brand-text leading-tight tracking-tight uppercase">
                            {title}
                        </h2>
                    </div>

                    {imageUrl && (
                        <div className="mb-8 rounded-[32px] overflow-hidden shadow-2xl border-4 border-white relative group">
                            <img src={imageUrl} alt="Duyuru Görseli" className="w-full h-auto object-cover max-h-72 group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    )}

                    <div className="prose prose-slate max-w-none text-brand-text/80 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium bg-brand-bg/50 p-6 rounded-3xl border border-brand-border">
                        {content}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-white border-t border-brand-border flex-shrink-0">
                    <button 
                        onClick={onDismiss}
                        className="btn-hardware w-full py-4 flex items-center justify-center group shadow-lg shadow-brand-accent/20"
                    >
                        <span className="font-black uppercase tracking-widest text-xs">Okudum, Anladım</span>
                        <CheckCircle2 size={18} className="ml-2 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
             <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 20px; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default AnnouncementModal;
