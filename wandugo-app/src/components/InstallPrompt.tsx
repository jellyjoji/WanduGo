"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInStandaloneMode() {
  return (
    ("standalone" in navigator &&
      (navigator as Record<string, unknown>).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

    if (isIOS()) {
      // iOS doesn't support beforeinstallprompt — show manual guide
      setIosMode(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // If the event never fires within 3s (already installed or not eligible),
    // don't show anything
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white font-bold text-xl select-none">
          W
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Install WanduGo
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {iosMode
              ? 'Tap the share icon below, then "Add to Home Screen"'
              : "Add to your home screen for the best experience"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {!iosMode && (
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
