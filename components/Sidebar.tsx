
import React from 'react';
import { MenuItem, Language, Role } from '../types';
import { translations } from '../translations';

interface SidebarProps {
  isOpen: boolean;
  lang: Language;
  role: Role;
  activeItem: string;
  onSelectItem: (id: string) => void;
  onClose: () => void;
  showroomLogo?: string;
  showroomName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, lang, role, activeItem, onSelectItem, onClose, showroomLogo, showroomName }) => {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Admin menu - all items
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t.menu.dashboard, icon: '📊', roles: ['admin'] },
    { id: 'showroom', label: t.menu.showroom, icon: '🏎️', roles: ['admin', 'worker', 'driver'] },
    { id: 'suppliers', label: t.menu.suppliers, icon: '🤝', roles: ['admin'] },
    { id: 'purchase', label: t.menu.purchase, icon: '🛒', roles: ['admin'] },
    { id: 'receipts', label: 'Reçus', icon: '📄', roles: ['admin'] },
    { id: 'pos', label: t.menu.pos, icon: '🏪', roles: ['admin', 'worker'] },
    { id: 'clients', label: t.menu.clients, icon: '👥', roles: ['admin', 'worker'] },
    { id: 'team', label: t.menu.team, icon: '🧑‍💼', roles: ['admin'] },
    { id: 'billing', label: t.menu.billing, icon: '📄', roles: ['admin', 'worker'] },
    { id: 'expenses', label: t.menu.expenses, icon: '💸', roles: ['admin', 'worker'] },
    { id: 'reports', label: t.menu.reports, icon: '📈', roles: ['admin'] },
  ];

  // Worker specific menu with payments history
  const workerMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t.menu.dashboard, icon: '📊', roles: ['worker'] },
    { id: 'showroom', label: t.menu.showroom, icon: '🏎️', roles: ['worker'] },
    { id: 'suppliers', label: t.menu.suppliers, icon: '🤝', roles: ['worker'] },
    { id: 'purchase', label: t.menu.purchase, icon: '🛒', roles: ['worker'] },
    { id: 'pos', label: t.menu.pos, icon: '🏪', roles: ['worker'] },
    { id: 'clients', label: t.menu.clients, icon: '👥', roles: ['worker'] },
    { id: 'billing', label: t.menu.billing, icon: '📄', roles: ['worker'] },
    { id: 'expenses', label: t.menu.expenses, icon: '💸', roles: ['worker'] },
    { id: 'worker-payments', label: 'Historique Paiements', icon: '💳', roles: ['worker'] },
  ];

  // Determine which menu to use based on role
  const allMenuItems = role === 'admin' ? adminMenuItems : workerMenuItems;
  const configItem: MenuItem = { id: 'config', label: t.menu.config, icon: '⚙️', roles: ['admin', 'worker'] };
  const filteredMenuItems = allMenuItems.filter(item => item.roles.includes(role || 'admin'));
  const showConfig = configItem.roles.includes(role || 'admin');

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 bottom-0 z-50 bg-gradient-to-b from-slate-950 via-black to-slate-950 border-${isRtl ? 'l' : 'r'} border-red-600/30 transition-all duration-500 w-[280px] ${isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')} ${isRtl ? 'right-0' : 'left-0'} flex flex-col shadow-[4px_0_30px_rgba(220,38,38,0.15)]`}>
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-800 rounded-full blur-[80px] opacity-5 animate-blob pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-red-700 rounded-full blur-[60px] opacity-5 animate-blob pointer-events-none" style={{animationDelay:'3s'}}></div>
        <div className="flex-shrink-0 flex items-center h-20 px-6 border-b border-red-600/30 gap-3 overflow-hidden bg-gradient-to-r from-red-950/50 to-black/50">
          <div className="relative inline-flex p-2 rounded-[1.2rem] bg-red-600/20 backdrop-blur-lg shrink-0 border border-red-600/40 ring-4 ring-red-600/20 animate-pulse group hover:border-red-500/80 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all">
            {showroomLogo ? (
              <img src={showroomLogo} className="h-10 w-auto max-w-[120px] object-contain rounded-xl relative z-10 drop-shadow-sm transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center shadow-lg shadow-red-600/50 relative z-10"><span className="text-2xl">🚗</span></div>
            )}
          </div>
          <div>
            <p className="text-red-100 font-black text-sm truncate max-w-[180px]">{showroomName || 'Showroom'}</p>
            <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">Management</p>
          </div>
        </div>

        <nav className="flex-grow mt-8 px-4 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSelectItem(item.id); onClose(); }}
              className={`w-full flex items-center rounded-2xl px-4 py-3 font-black text-sm group relative transition-all duration-300 ${
                activeItem === item.id 
                  ? 'bg-gradient-to-r from-red-700/80 to-red-600/60 border border-red-500/60 text-red-100 shadow-lg shadow-red-600/30 border-l-4 border-l-red-500' 
                  : 'text-red-400/70 hover:text-red-100 hover:bg-red-600/25 hover:border hover:border-red-500/60 hover:shadow-lg hover:shadow-red-600/40 hover:scale-105 hover:translate-x-1'
              }`}
            >
              <span className="h-8 w-8 rounded-xl flex items-center justify-center text-base transition-transform group-hover:scale-110">{item.icon}</span>
              <span className="ml-3 whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-red-600/20 mt-auto bg-red-950/30 relative z-10">
          <button
            onClick={() => { onSelectItem(configItem.id); onClose(); }}
            className={`w-full flex items-center rounded-2xl px-4 py-3 transition-all font-black text-sm ${
              activeItem === configItem.id 
                ? 'bg-gradient-to-r from-red-700/80 to-red-600/60 border border-red-500/60 text-red-100 shadow-lg shadow-red-600/30 border-l-4 border-l-red-500' 
                : 'text-red-400/70 hover:text-red-300 hover:bg-red-600/15 hover:border hover:border-red-600/30'
            }`}
          >
            <span className="h-8 w-8 rounded-xl flex items-center justify-center text-base">{configItem.icon}</span>
            <span className="ml-3">{configItem.label}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
