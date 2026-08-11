import React, { useEffect, useState } from 'react';
import Modal from './Modal/Modal';
import {
    INSTALL_PROMPT_STATE_EVENT,
    getInstallPromptState,
    promptInstall,
} from '../pwa/installPrompt';
import './PwaInstallButton.css';

function isDesktopBrowser() {
    const iPadOS = window.navigator.userAgent.includes('Macintosh')
        && window.navigator.maxTouchPoints > 1;
    return !iPadOS && !/Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

function browserHelp() {
    const ua = window.navigator.userAgent;
    if (/Edg\//.test(ua)) {
        return 'No Microsoft Edge, abra o menu (…) e escolha Aplicativos → Instalar Obraly.';
    }
    if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) {
        return 'No Safari, abra o menu Arquivo e escolha Adicionar ao Dock.';
    }
    if (/Firefox\//.test(ua)) {
        return 'O Firefox não oferece instalação completa de PWA no computador. Abra o Obraly no Chrome ou Edge para instalar como aplicativo.';
    }
    return 'No Chrome, clique no ícone de instalação na barra de endereço ou abra o menu (⋮) e escolha Instalar Obraly.';
}

export default function PwaInstallButton({ variant = 'default', desktopOnly = false }) {
    const [installState, setInstallState] = useState(getInstallPromptState);
    const [isInstalling, setIsInstalling] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleState = (event) => setInstallState(event.detail);
        window.addEventListener(INSTALL_PROMPT_STATE_EVENT, handleState);
        setInstallState(getInstallPromptState());
        return () => window.removeEventListener(INSTALL_PROMPT_STATE_EVENT, handleState);
    }, []);

    const handleInstall = async () => {
        if (isInstalling) return;
        if (!installState.available) {
            setShowHelp(true);
            return;
        }

        setIsInstalling(true);
        try {
            await promptInstall();
        } finally {
            setIsInstalling(false);
        }
    };

    const desktop = isDesktopBrowser();
    if (installState.installed || (desktopOnly && !desktop)) return null;
    if (!installState.available && !desktop) return null;

    return (
        <>
            <button
                type="button"
                className={`pwa-install-button pwa-install-button--${variant}`}
                onClick={handleInstall}
                disabled={isInstalling}
            >
                <i className="ti ti-device-desktop-down" aria-hidden="true" />
                {isInstalling
                    ? 'Preparando instalação...'
                    : variant === 'header' ? 'Instalar no computador' : 'Instalar Obraly no computador'}
            </button>
            <Modal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={<><i className="ti ti-device-desktop-down" /> Instalar Obraly no computador</>}
                footer={(
                    <button type="button" className="pwa-install-help-ok" onClick={() => setShowHelp(false)}>
                        Entendi
                    </button>
                )}
            >
                <div className="pwa-install-help">
                    <img src="/logo192.png" alt="" />
                    <div>
                        <p>{browserHelp()}</p>
                        <p>Depois de instalado, o Obraly abre em uma janela própria e pode ser fixado na barra de tarefas ou no Dock.</p>
                    </div>
                </div>
            </Modal>
        </>
    );
}
