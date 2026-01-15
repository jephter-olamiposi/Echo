import React from 'react';
import { Icons } from '../Icons';
import { NavItem } from '../ui/NavItem';
import { MobileView } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';



interface NavProps {
  currentView: MobileView;
  onChange: (view: MobileView) => void;
  badgeCount?: number;
}

export const Nav: React.FC<NavProps> = ({ currentView, onChange, badgeCount = 0 }) => {
  const { t } = useLanguage();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-(--color-bg)/90 backdrop-blur-xl border-t border-(--color-border) flex justify-around items-center px-4 pt-1.5 landscape:pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] w-full transition-colors duration-300">
      <NavItem
        icon={Icons.home}
        activeIcon={Icons.homeFilled}
        label={t('dashboard')}
        isActive={currentView === 'dashboard'}
        onClick={() => onChange('dashboard')}
      />

      <NavItem
        icon={Icons.history}
        activeIcon={Icons.historyFilled}
        label={t('history')}
        isActive={currentView === 'history'}
        onClick={() => onChange('history')}
        badge={badgeCount}
      />

      <NavItem
        icon={Icons.settings}
        activeIcon={Icons.settingsFilled}
        label={t('settings')}
        isActive={currentView === 'settings'}
        onClick={() => onChange('settings')}
      />
    </nav>
  );
};
