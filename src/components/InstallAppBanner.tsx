import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed';
const INSTALL_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Singleton para compartilhar o prompt entre componentes
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Hook para usar o install prompt em qualquer componente
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listener para atualizar quando o prompt global mudar
    const updatePrompt = () => {
      setDeferredPrompt(globalDeferredPrompt);
    };
    listeners.add(updatePrompt);

    return () => {
      listeners.delete(updatePrompt);
    };
  }, []);

  const install = useCallback(async () => {
    if (!globalDeferredPrompt) return false;

    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        notifyListeners();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  }, []);

  return {
    canInstall: !isInstalled && (!!deferredPrompt || isIOS),
    isIOS,
    isInstalled,
    install,
  };
}

// Botão de instalar para usar em qualquer lugar
export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isIOS, install } = useInstallPrompt();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!canInstall) return null;

  if (isIOS) {
    return (
      <div className={className}>
        <Button
          onClick={() => setShowIOSInstructions(!showIOSInstructions)}
          variant="outline"
          size="sm"
          className="gap-2 text-primary border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Smartphone className="w-4 h-4" />
          Instalar App
        </Button>
        {showIOSInstructions && (
          <div className="mt-2 p-3 bg-secondary rounded-lg text-sm">
            <p className="font-medium mb-1">Para instalar no iPhone/iPad:</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Share className="w-4 h-4" />
              <span>Toque em "Compartilhar" → "Adicionar à Tela Inicial"</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={install}
      variant="outline"
      size="sm"
      className={`gap-2 text-primary border-primary hover:bg-primary hover:text-primary-foreground ${className}`}
    >
      <Download className="w-4 h-4" />
      Instalar App
    </Button>
  );
}

export default function InstallAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { canInstall, isIOS, isInstalled, install } = useInstallPrompt();

  useEffect(() => {
    // Setup global listener for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      notifyListeners();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    if (isInstalled) return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < INSTALL_DISMISSED_DURATION) {
        return;
      }
    }

    // Show banner after delay if can install
    if (canInstall) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString());
    setShowBanner(false);
  };

  if (isInstalled || !showBanner || !canInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg animate-slide-up">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm">Instale nosso App!</h3>
            <p className="text-xs opacity-90 mt-0.5">
              {isIOS 
                ? 'Toque em "Compartilhar" e depois "Adicionar à Tela Inicial"'
                : 'Acesse mais rápido direto da tela inicial'
              }
            </p>
            
            {!isIOS && (
              <Button
                onClick={handleInstall}
                size="sm"
                variant="secondary"
                className="mt-2 h-8 text-xs font-semibold"
              >
                <Download className="w-3 h-3 mr-1" />
                Instalar Agora
              </Button>
            )}
            
            {isIOS && (
              <div className="flex items-center gap-1 mt-2 text-xs opacity-90">
                <Share className="w-4 h-4" />
                <span>Compartilhar → Adicionar à Tela Inicial</span>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
