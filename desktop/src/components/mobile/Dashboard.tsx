import React from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { ClipboardEntry, LinkedDevice } from '../../types';
import { formatTime } from '../../utils';
import { haptic } from '../../utils/haptics';
import { Skeleton } from '../ui/Skeleton';
import { CopyButton } from '../ui/CopyButton';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { QuickAction } from '../ui/QuickAction';
import { StatCard } from '../ui/StatCard';
import { useLanguage } from '../../contexts/LanguageContext';



interface MobileDashboardProps {
  isLoading?: boolean;
  isRefreshing?: boolean;
  connected: boolean;
  syncing?: boolean;
  queuedCount?: number;
  history: ClipboardEntry[];
  devices: LinkedDevice[];
  onCopy: (text: string) => void;
  onShowDevices: () => void;
  onScanQR: () => void;
  onEnterKey: () => void;
  onShowPairingCode: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  onViewAllHistory: () => void;
}

export const Dashboard: React.FC<MobileDashboardProps> = ({
  isLoading,
  isRefreshing,
  connected,
  syncing,
  queuedCount,
  history,
  devices,
  onShowDevices,
  onScanQR,
  onEnterKey,
  onShowPairingCode,
  onCopy,
  onDelete,
  onViewAllHistory,
  onRefresh
}) => {
  const { containerRef, pullHeight, isLoading: isHookLoading } = usePullToRefresh(onRefresh);
  const { t } = useLanguage();
  const activeRefreshing = isRefreshing || isHookLoading;
  const latestItem = history[0];

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-(--color-text-primary) overflow-hidden transition-colors duration-300">
      <MobileHeader
        centerAction={<span className="text-[17px] font-semibold text-(--color-text-primary)">Echo</span>}
        className="bg-transparent backdrop-blur-md sticky top-0 z-10"
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar pb-32! relative"
      >
        <div
          className="absolute top-0 left-0 w-full flex items-center justify-center pointer-events-none z-40"
          style={{ height: `${pullHeight}px` }}
        >
          <div
            className={`p-2 rounded-full bg-(--color-surface-raised) border border-(--color-border) shadow-xl mt-12 transition-all duration-300 ${activeRefreshing ? 'animate-pulse ring-4 ring-purple-500/20' : ''}`}
            style={{
              opacity: Math.min(pullHeight / 50, 1),
              transform: activeRefreshing
                ? 'scale(1.1)'
                : `translateY(${Math.min(pullHeight * 0.2, 20)}px) rotate(${pullHeight * 3}deg) scale(${Math.min(pullHeight / 60, 1)})`,
            }}
          >
            <div className={`w-5 h-5 text-purple-400 ${activeRefreshing ? 'animate-spin' : ''}`}>
              {Icons.sync}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 w-full px-4 pt-2">
          <div className="flex justify-center py-6">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton variant="rectangular" className="w-16 h-16 rounded-2xl!" />
                <Skeleton variant="text" className="w-32 h-5 rounded!" />
                <Skeleton variant="circular" className="w-24 h-7 mt-1" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 ${connected
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                    : 'bg-(--color-surface) text-(--color-text-tertiary) border-(--color-border)'
                    }`}
                  onClick={() => haptic.medium()}
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    {Icons.clipboard}
                  </div>
                </div>
                <h2 className="text-[17px] font-semibold text-(--color-text-primary)">
                  {connected ? t('ready_to_sync') : t('waiting_for_device')}
                </h2>
                <StatusBadge status={connected ? 'online' : 'offline'} />
                {syncing && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 animate-pulse">
                    <div className="w-3 h-3 text-purple-400 animate-spin">
                      {Icons.sync}
                    </div>
                    <span className="text-[12px] text-purple-400 font-medium">
                      {t('syncing')}...
                    </span>
                  </div>
                )}
                {!connected && queuedCount && queuedCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[12px] text-amber-400 font-medium">
                      {queuedCount} {t('pending_sync')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <Card variant="ghost" padding="lg" className="flex items-center justify-center gap-5">
              <Skeleton variant="rectangular" className="w-14 h-12 rounded-xl!" />
              <Skeleton variant="rectangular" className="w-14 h-12 rounded-xl!" />
              <Skeleton variant="rectangular" className="w-14 h-12 rounded-xl!" />
            </Card>
          ) : (
            <Card variant="default" padding="md" className="flex items-center justify-between">
              <StatCard value={history.length} label={t('items')} />
              <div className="w-px h-8 bg-(--color-border)" />
              <StatCard value={devices.length} label={t('devices')} onClick={onShowDevices} />
              <div className="w-px h-8 bg-(--color-border)" />
              <StatCard value="E2E" label={t('encrypted')} />
            </Card>
          )}

          {!isLoading && latestItem && (
            <Card variant="default" padding="lg" className="rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] font-medium text-purple-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  {t('latest_clip')}
                </span>
                <span className="text-[12px] text-(--color-text-tertiary)">{formatTime(latestItem.timestamp)}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-(--color-text-secondary) line-clamp-2 overflow-hidden mb-5">
                {latestItem.content.substring(0, 100)}
                {latestItem.content.length > 100 ? '...' : ''}
              </p>
              <div className="flex gap-3">
                <CopyButton
                  content={latestItem.content}
                  onCopy={onCopy}
                  className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-[15px] font-medium bg-(--color-text-primary) text-(--color-bg) active:scale-[0.98] transition-all hover:opacity-90"
                  iconClassName="w-4 h-4"
                >
                  {t('copy')}
                </CopyButton>
                <Button
                  variant="danger"
                  size="md"
                  square
                  icon={Icons.trash}
                  onClick={() => { haptic.medium(); onDelete(latestItem.id); }}
                  aria-label={t('delete')}
                />
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[13px] font-medium text-(--color-text-tertiary)">{t('recent')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-400 bg-purple-500/10"
                onClick={onViewAllHistory}
              >
                {t('view_all')}
              </Button>
            </div>

            {history.length > 0 ? (
              <Card variant="default" padding="none" className="divide-y divide-(--color-border) overflow-hidden">
                {history.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    className="flex justify-between items-center min-h-14 px-4 w-full text-left active:bg-(--color-surface-raised) transition-colors"
                    onClick={() => { haptic.light(); onViewAllHistory(); }}
                  >
                    <span className="text-[15px] text-(--color-text-secondary) truncate pr-4">
                      {item.content}
                    </span>
                    <span className="text-[12px] text-(--color-text-tertiary) shrink-0">
                      {formatTime(item.timestamp).split(' ')[0]}
                    </span>
                  </button>
                ))}
              </Card>
            ) : !isLoading && (
              <Card variant="outlined" padding="lg" className="border-dashed flex flex-col items-center justify-center gap-2 text-center">
                <div className="w-8 h-8 text-(--color-text-tertiary)">{Icons.history}</div>
                <span className="text-(--color-text-tertiary) text-[14px]">{t('no_history')}</span>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-[13px] font-medium text-(--color-text-tertiary) pl-1">{t('quick_actions')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction
                icon={Icons.qr}
                iconBg="bg-emerald-500/15 text-emerald-400"
                label={t('scan_qr')}
                onClick={onScanQR}
              />
              <QuickAction
                icon={Icons.shield}
                iconBg="bg-amber-500/15 text-amber-400"
                label={t('enter_key')}
                onClick={onEnterKey}
              />
              <QuickAction
                icon={Icons.code}
                iconBg="bg-sky-500/15 text-sky-400"
                label={t('show_pairing_code')}
                onClick={onShowPairingCode}
              />
              <QuickAction
                icon={Icons.devices}
                iconBg="bg-purple-500/15 text-purple-400"
                label={t('devices')}
                onClick={onShowDevices}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

