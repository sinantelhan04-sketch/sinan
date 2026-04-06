
import React from 'react';

interface AnnouncementModalProps {
    title: string;
    content: string;
    imageUrl?: string | null;
    onDismiss: () => void;
    isPreview?: boolean;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ title, content, imageUrl, onDismiss, isPreview }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md animate-fade-in">
            <div className="bg-brand-card border border-brand-border w-full max-w-lg rounded-[32px] shadow-2xl shadow-brand-accent/10 overflow-hidden flex flex-col max-h-[90vh] animate-soft-slide-up relative">
                
                {/* Header Pattern */}
                <div className="h-24 bg-brand-accent relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full transform -translate-x-10 translate-y-10"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                         <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                         </div>
                    </div>
                    {isPreview && (
                        <div className="absolute top-2 right-2 bg-brand-accent/50 text-white text-[10px] font-bold px-2 py-1 rounded shadow border border-white/30">ÖNİZLEME</div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-grow custom-scrollbar">
                    <h2 className="text-2xl font-black text-center text-brand-text mb-6 leading-tight tracking-tight uppercase">
                        {title}
                    </h2>

                    {imageUrl && (
                        <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border border-brand-border">
                            <img src={imageUrl} alt="Duyuru Görseli" className="w-full h-auto object-cover max-h-64" />
                        </div>
                    )}

                    <div className="prose prose-invert max-w-none text-brand-text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
                        {content}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-brand-bg border-t border-brand-border flex-shrink-0">
                    <button 
                        onClick={onDismiss}
                        className="btn-hardware w-full py-3.5 flex items-center justify-center group"
                    >
                        <span>Okudum, Anladım</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
             <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 86, 179, 0.3); border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default AnnouncementModal;
