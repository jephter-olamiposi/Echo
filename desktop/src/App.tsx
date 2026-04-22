import "./App.css";

import { exportKey } from "./crypto";
import { useEchoController } from "./hooks/useEchoController";
import { useToast, ToastProvider } from "./utils";
import { Icons } from "./components/Icons";
import { Modal } from "./components/ui/Modal";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { MobileLayout } from "./components/mobile";
import { ScanningOverlay } from "./components/mobile/ScanningOverlay";
import { Sidebar } from "./components/desktop/Sidebar";
import { Main } from "./components/desktop/Main";
import { Login } from "./components/auth/Login";
import { Register } from "./components/auth/Register";
import { Onboarding } from "./components/auth/Onboarding";
import { AuthLayout } from "./components/auth/AuthLayout";
import { DeviceSetup } from "./components/auth/DeviceSetup";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { showToast } = useToast();
  const controller = useEchoController();

  const { clipboard, keys, ws, auth, device, ui, actions } = controller;

  if (auth.view === "onboarding") {
    return (
      <ErrorBoundary>
        <Onboarding onComplete={auth.handleOnboardingComplete} />
      </ErrorBoundary>
    );
  }

  if (auth.view === "login") {
    return (
      <ErrorBoundary>
        <AuthLayout>
          <Login
            initialEmail={auth.email || ""}
            onSuccess={auth.handleAuthSuccess}
            onSwitchToRegister={() => auth.setView("register")}
          />
        </AuthLayout>
      </ErrorBoundary>
    );
  }

  if (auth.view === "register") {
    return (
      <ErrorBoundary>
        <AuthLayout>
          <Register
            initialEmail={auth.email || ""}
            onSuccess={auth.handleAuthSuccess}
            onSwitchToLogin={() => auth.setView("login")}
          />
        </AuthLayout>
      </ErrorBoundary>
    );
  }

  if (auth.view === "main" && keys.needsKeySetup) {
    return (
      <ErrorBoundary>
        {ui.isScanning && <ScanningOverlay onCancel={actions.handleCancelScan} />}
        {!ui.isScanning && (
          <AuthLayout>
            <DeviceSetup
              onScanQR={actions.handleScanQR}
              onImportKey={actions.handleDeviceSetupImportKey}
              onCreateNew={actions.handleDeviceSetupCreateNew}
              onLogout={auth.handleLogout}
              isScanning={ui.isScanning}
            />
          </AuthLayout>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {ui.isScanning && <ScanningOverlay onCancel={actions.handleCancelScan} />}

      <div
        className={`transition-opacity duration-300 ${
          ui.isScanning ? "opacity-0" : "opacity-100"
        }`}
      >
        {device.isMobilePlatform && (
          <div className="h-dvh w-full">
            <MobileLayout
              history={clipboard.history}
              devices={device.devices}
              mobileView={ui.mobileView}
              filterType={ui.filterType}
              searchQuery={ui.searchQuery}
              selectedEntry={ui.selectedEntry}
              connected={device.connected}
              isLoading={auth.isLoading}
              isRefreshing={ui.isRefreshing}
              email={auth.email || ""}
              syncing={!device.connected && ws.queuedCount > 0}
              queuedCount={ws.queuedCount}
              onCopy={clipboard.copyToClipboard}
              onDelete={clipboard.deleteEntry}
              onClearHistory={() => ui.setShowClearConfirm(true)}
              onLogout={auth.handleLogout}
              onScanQR={actions.handleScanQR}
              onEnterKey={() => ui.setShowKeyInput(true)}
              onShowPairingCode={() => ui.setShowQR(true)}
              onShowDevices={() => ui.setShowDevices(true)}
              onViewChange={ui.setMobileView}
              onSearchChange={ui.setSearchQuery}
              onFilterChange={ui.setFilterType}
              onSelectEntry={ui.setSelectedEntry}
              onPin={clipboard.togglePin}
              onRefresh={actions.handleRefresh}
            />
          </div>
        )}

        {!device.isMobilePlatform && (
          <div className="flex flex-row h-screen w-full overflow-hidden bg-(--color-bg) text-(--color-text-primary)">
            <Sidebar
              history={clipboard.history}
              searchQuery={ui.searchQuery}
              filterType={ui.filterType}
              selectedEntryId={ui.selectedEntry?.id || null}
              onSearchChange={ui.setSearchQuery}
              onFilterChange={ui.setFilterType}
              onSelectEntry={ui.setSelectedEntry}
              onClearHistory={() => ui.setShowClearConfirm(true)}
              onCopyConstructor={clipboard.copyToClipboard}
            />

            <Main
              selectedEntry={ui.selectedEntry}
              connected={device.connected}
              devices={device.devices}
              historyCount={clipboard.history.length}
              keyFingerprint={keys.fingerprint}
              backgroundModeEnabled={ui.backgroundModeEnabled}
              onCopy={clipboard.copyToClipboard}
              onPin={clipboard.togglePin}
              onDelete={(id: string) => {
                clipboard.deleteEntry(id);
                if (ui.selectedEntry?.id === id) ui.setSelectedEntry(null);
              }}
              onLinkDevice={() => ui.setShowQR(true)}
              onEnterKey={() => ui.setShowKeyInput(true)}
              onManageDevices={() => ui.setShowDevices(true)}
              onToggleBackgroundMode={actions.toggleBackgroundMode}
              onLogout={auth.handleLogout}
              onBack={() => ui.setSelectedEntry(null)}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={ui.showKeyInput}
        onClose={() => ui.setShowKeyInput(false)}
        title="Enter sync key"
        description="Paste the encryption key from your other device."
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => ui.setShowKeyInput(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={actions.handleManualKeySync}
            >
              Save
            </Button>
          </div>
        }
      >
        <Input
          placeholder="Paste key here..."
          value={ui.manualKey}
          onChange={(e) => ui.setManualKey(e.target.value)}
          className="font-mono"
        />
      </Modal>

      <Modal
        isOpen={ui.showQR && !!keys.encryptionKey}
        onClose={() => ui.setShowQR(false)}
        title="Link a device"
        description="Scan this QR code with the Echo mobile app"
        footer={
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => ui.setShowQR(false)}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 bg-white rounded-2xl">
            {ui.qrDataUrl ? (
              <img
                src={ui.qrDataUrl}
                alt="QR code for device pairing - scan with Echo mobile app"
                width={200}
                height={200}
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-sm">
                Generating...
              </div>
            )}
          </div>
          <div className="w-full bg-(--color-surface-raised) p-3 rounded-xl border border-(--color-border) flex items-center gap-2">
            <code className="text-[12px] text-(--color-text-tertiary) truncate flex-1 font-mono">
              {keys.encryptionKey ? exportKey(keys.encryptionKey) : ""}
            </code>
            <Button
              variant="primary"
              size="sm"
              icon={Icons.copy}
              onClick={() => {
                if (keys.encryptionKey) {
                  clipboard.copyToClipboard(exportKey(keys.encryptionKey));
                  showToast("Encryption key copied!", "success");
                }
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={ui.showDevices}
        onClose={() => ui.setShowDevices(false)}
        title="Linked devices"
        description="Devices currently syncing with your clipboard."
        footer={
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => ui.setShowDevices(false)}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {device.devices.map((linkedDevice) => (
            <div
              key={linkedDevice.id}
              className="flex items-center justify-between p-4 bg-(--color-surface-raised) rounded-2xl border border-(--color-border)"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  {device.getDeviceIcon(linkedDevice.name)}
                </div>
                <div>
                  <p className="text-[15px] font-medium text-(--color-text-primary)">
                    {linkedDevice.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        linkedDevice.isCurrentDevice
                          ? "bg-green-500"
                          : "bg-(--color-text-tertiary)"
                      }`}
                    />
                    <p className="text-[12px] text-(--color-text-tertiary)">
                      {linkedDevice.isCurrentDevice ? "This device" : "Online"}
                    </p>
                  </div>
                </div>
              </div>
              {!linkedDevice.isCurrentDevice && (
                <button
                  onClick={() => device.removeDevice(linkedDevice.id)}
                  className="text-(--color-text-secondary) hover:text-red-500 transition-colors"
                >
                  {Icons.trash}
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={ui.showClearConfirm}
        onClose={() => ui.setShowClearConfirm(false)}
        title="Clear history?"
        description="This action cannot be undone."
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => ui.setShowClearConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onClick={actions.handleClearHistoryConfirm}
            >
              Clear history
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-(--color-text-secondary) text-center">
          Delete all items from your clipboard history?
        </p>
      </Modal>
    </ErrorBoundary>
  );
}

export default App;
