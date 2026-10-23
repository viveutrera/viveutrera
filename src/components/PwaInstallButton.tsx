import { Download, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { LanguageCode } from '../domain/types';
import { t } from '../i18n/ui';
import { isPwaInstalled, requestPwaInstall, subscribePwaInstall } from '../lib/pwaInstall';

export function PwaInstallButton({ language }: { language: LanguageCode }) {
  const installed = useSyncExternalStore(subscribePwaInstall, isPwaInstalled);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (showHelp && !installed) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showHelp, installed]);

  async function install() {
    if (busy) return;
    setBusy(true);
    try {
      if (await requestPwaInstall() === 'unavailable') setShowHelp(true);
    } catch {
      setShowHelp(true);
    } finally {
      setBusy(false);
    }
  }

  if (installed) return null;

  return (
    <>
      <button className="public-footer-install" type="button" onClick={install} disabled={busy}>
        <Download size={18} aria-hidden="true" />
        {t(language, 'installApp')}
      </button>
      <dialog className="pwa-install-dialog" ref={dialog} aria-labelledby={titleId} onClose={() => setShowHelp(false)}>
        <div className="pwa-install-dialog-header">
          <h2 id={titleId}>{t(language, 'installAppTitle')}</h2>
          <button className="pwa-install-close" type="button" onClick={() => setShowHelp(false)} aria-label={t(language, 'close')}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p>{t(language, 'installAppIntro')}</p>
        <ol>
          <li>{t(language, isIos ? 'installIosShare' : 'installBrowserMenu')}</li>
          <li>{t(language, isIos ? 'installIosAdd' : 'installBrowserAdd')}</li>
          <li>{t(language, 'installAppConfirm')}</li>
        </ol>
        <p className="hint">{t(language, isIos ? 'installIosSafari' : 'installBrowserHint')}</p>
      </dialog>
    </>
  );
}
