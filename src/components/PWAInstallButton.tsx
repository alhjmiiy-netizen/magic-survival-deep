import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';
import { sound } from '../audio/soundEngine';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone mode on the phone/desktop, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sound.playItemUse();
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        // If dismissed or failed, show the fallback guide
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'hero' ? (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-900/80 via-sky-800/80 to-blue-950/80 hover:from-cyan-700/80 hover:to-blue-900/80 border border-sky-400/50 hover:border-sky-300 text-sky-200 hover:text-white font-cinzel font-bold text-xs shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.6)] transition-all cursor-pointer backdrop-blur-md group ${className}`}
          title="Install Magic Survival on Phone or Desktop"
        >
          <div className="relative">
            <Smartphone className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="tracking-wider">INSTALL ON PHONE</span>
          <Download className="w-3.5 h-3.5 text-sky-300 ml-0.5 group-hover:translate-y-0.5 transition-transform" />
        </button>
      ) : variant === 'header' ? (
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/40 hover:border-sky-300 text-sky-300 hover:text-white text-xs font-cinzel font-bold shadow-md cursor-pointer transition-colors backdrop-blur-md ${className}`}
          title="Install / Download Game"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>App Download</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-900/70 to-blue-950/70 hover:from-sky-800 hover:to-blue-900 border border-sky-500/40 text-sky-200 font-cinzel text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors ${className}`}
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span>Download Game to Phone (PWA)</span>
        </button>
      )}

      {/* Ornate Dark Fantasy Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-950/95 gold-border p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-slate-100 font-sans">
            {/* Close Button */}
            <button
              onClick={() => {
                sound.playItemUse();
                setShowGuideModal(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-amber-400 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl border border-sky-400/60 bg-sky-950/50 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                <img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="App Icon" className="w-9 h-9 rounded-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold font-cinzel text-white tracking-wide">
                  Install Magic Survival
                </h3>
                <p className="text-xs text-sky-300/80 font-cinzel">
                  Play full-screen offline on mobile
                </p>
              </div>
            </div>

            {/* Guide Body */}
            {isIOS ? (
              <div className="space-y-3.5 bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="text-amber-300 font-bold font-cinzel uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Apple iPhone / iPad (Safari)</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <div className="text-slate-300 pt-0.5">
                    Tap the <strong className="text-sky-300 inline-flex items-center gap-1 mx-1"><Share2 className="w-3.5 h-3.5 inline text-sky-400" /> Share</strong> button in your Safari toolbar (at the bottom or top).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <div className="text-slate-300 pt-0.5">
                    Scroll down and tap <strong className="text-amber-300 inline-flex items-center gap-1 mx-1"><PlusSquare className="w-3.5 h-3.5 inline text-amber-400" /> Add to Home Screen</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <div className="text-slate-300 pt-0.5">
                    Tap <strong className="text-emerald-300">Add</strong> at the top right. Launch the game from your home screen for full-screen immersive play!
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 bg-slate-900/70 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="text-sky-300 font-bold font-cinzel uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Android & Chromium Devices</span>
                </div>

                {isInstallable ? (
                  <button
                    onClick={async () => {
                      const res = await install();
                      if (res) setShowGuideModal(false);
                    }}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white font-bold font-cinzel text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Tap to Install Immediately
                  </button>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                        1
                      </span>
                      <div className="text-slate-300 pt-0.5">
                        Tap the browser menu (three dots <strong className="text-sky-300">⋮</strong> in Chrome or Edge).
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <div className="text-slate-300 pt-0.5">
                        Select <strong className="text-amber-300">"Install App"</strong> or <strong className="text-amber-300">"Add to Home screen"</strong>.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950 border border-sky-500/60 text-sky-300 flex items-center justify-center font-bold text-xs">
                        3
                      </span>
                      <div className="text-slate-300 pt-0.5">
                        Open Magic Survival anytime right from your home screen with zero browser bars!
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Offline & Performance perks */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-cinzel">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Fast 60 FPS Engine
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <CheckCircle className="w-3.5 h-3.5" /> Fullscreen Display
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <CheckCircle className="w-3.5 h-3.5" /> Offline Caching
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                sound.playItemUse();
                setShowGuideModal(false);
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-cinzel text-xs font-bold cursor-pointer transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
