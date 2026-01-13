import React from 'react';


export interface SettingsGroupProps {
  label: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({ label, children }) => (
  <div className="flex flex-col">
    <h3 className="text-[13px] font-semibold text-(--color-text-tertiary) uppercase tracking-wide px-4 pb-2">
      {label}
    </h3>
    <div className="bg-(--color-surface-raised)/40 backdrop-blur-xl border border-(--color-border) rounded-xl overflow-hidden divide-y divide-(--color-border)">
      {children}
    </div>
  </div>
);
