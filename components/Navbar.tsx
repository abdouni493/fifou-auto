
import React from 'react';
import { Language, Role } from '../types';
import { translations } from '../translations';

interface NavbarProps {
  lang: Language;
  role: Role;
  userName?: string;
  onToggleLang: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ lang, role, userName, onToggleLang, onLogout, onToggleSidebar, isSidebarOpen }) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  return (
    <header
      className={`fixed top-0 right-0 left-0 h-20 bg-gradient-to-r from-slate-950/95 via-black/95 to-slate-950/95 backdrop-blur-2xl border-b border-red-600/30 shadow-[0_4px_30px_rgba(220,38,38,0.15)] z-30 transition-all duration-500 ${
        isSidebarOpen ? (isRtl ? 'md:pr-[280px]' : 'md:pl-[280px]') : ''
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4 gap-2">
          <button
            onClick={onToggleSidebar}
            className="p-3 rounded-2xl bg-red-600/15 border border-red-600/30 hover:bg-red-600/30 hover:border-red-500/60 transition-all duration-300 text-red-400/70"
          >
            <span className="text-xl">{isSidebarOpen ? '🪁' : '☰'}</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-600 capitalize leading-none mb-0.5">
              {role} Portal
            </h2>
            <p className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest">
              {userName ? `👤 ${userName}` : 'Live Connection'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-6 gap-2">
          <button
            onClick={onToggleLang}
            className="px-4 py-2.5 rounded-xl bg-red-600/15 border border-red-600/30 hover:bg-red-600/30 hover:border-red-500/60 font-bold text-sm text-red-400 transition-all duration-300"
          >
            {t.changeLang}
          </button>

          <div className="h-8 w-px bg-red-600/30 hidden sm:block"></div>

          <div className="flex items-center space-x-2 md:space-x-3 gap-2">
            <div className="text-right hidden lg:block">
              <p className="text-xs font-black text-red-100 uppercase tracking-tighter leading-none">{userName || role}</p>
              <p className="text-[10px] text-red-400/70 font-bold uppercase mt-0.5">Online Now</p>
            </div>
            <div className="h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-red-600/50 border border-red-500/60 ring-1 ring-red-600/20">
              {(userName || role)?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="p-3 rounded-2xl hover:bg-red-600/20 text-red-400/70 hover:text-red-300 hover:border hover:border-red-600/30 transition-all duration-300"
              title={t.logout}
            >
              🚪
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
