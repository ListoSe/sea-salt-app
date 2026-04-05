import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rulesImage: string;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, rulesImage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-1 md:p-6">
      <div className="absolute inset-0 bg-black/92 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-slate-900 w-full max-w-7xl h-auto max-h-[98vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <span className="text-white font-semibold tracking-wide">Sea Salt & Paper — Правила</span>
          <button onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center text-2xl">&times;</button>
        </div>
        <div className="overflow-y-auto p-1 md:p-2 bg-slate-950/50">
          <img src={rulesImage} alt="Rules" className="w-full h-auto rounded-xl border border-white/5" />
        </div>
      </div>
    </div>
  );
};