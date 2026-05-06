
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
    { id: 'team', label: t.menu.team, icon: '👥', roles: ['admin'] },
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
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 bottom-0 z-50 bg-white border-${isRtl ? 'l' : 'r'} border-slate-200 transition-all duration-500 w-[280px] ${isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')} ${isRtl ? 'right-0' : 'left-0'} flex flex-col shadow-2xl`}>
        <div className="flex-shrink-0 flex items-center h-24 px-8 border-b border-slate-100 gap-4 overflow-hidden">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20 overflow-hidden">
            {showroomLogo ? <img src={showroomLogo} className="h-full w-full object-cover" /> : <span className="text-2xl">⚡</span>}
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900 truncate uppercase">{showroomName || 'AutoLux'}</span>
        </div>

        <nav className="flex-grow mt-8 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSelectItem(item.id); if (window.innerWidth < 1024) onClose(); }}
              className={`w-full flex items-center rounded-2xl p-4 transition-all duration-300 group ${activeItem === item.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className={`text-2xl min-w-[40px] flex justify-center transition-transform ${activeItem === item.id ? '' : 'group-hover:scale-125'}`}>{item.icon}</span>
              <span className="ml-3 font-bold whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>

        {showConfig && (
          <div className="p-4 border-t border-slate-100 mt-auto space-y-4">
            {/* Config Button */}
            <button
              onClick={() => { onSelectItem(configItem.id); if (window.innerWidth < 1024) onClose(); }}
              className={`w-full flex items-center rounded-2xl p-4 transition-all ${activeItem === configItem.id ? 'custom-gradient-btn text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span className="text-2xl min-w-[40px] flex justify-center">{configItem.icon}</span>
              <span className="ml-3 font-bold">{configItem.label}</span>
            </button>
          </div>
        ) || (
          <div className="p-4 border-t border-slate-100 mt-auto">
            <button
              onClick={() => { onSelectItem(configItem.id); if (window.innerWidth < 1024) onClose(); }}
              className={`w-full flex items-center rounded-2xl p-4 transition-all ${activeItem === configItem.id ? 'custom-gradient-btn text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span className="text-2xl min-w-[40px] flex justify-center">{configItem.icon}</span>
              <span className="ml-3 font-bold">{configItem.label}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
