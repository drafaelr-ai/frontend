import React, { useEffect, useState } from 'react';
import './PwaInstallButton.css';

function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

// O navegador só expõe o prompt depois de validar manifesto, HTTPS e service
// worker. Por isso o botão aparece exclusivamente quando a instalação é válida.
export default function PwaInstallButton() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [installed, setInstalled] = useState(isStandaloneApp);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        const handleBeforeInstall = (event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };
        const handleInstalled = () => {
            setInstalled(true);
            setInstallPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt || isInstalling) return;

        setIsInstalling(true);
        try {
            installPrompt.prompt();
            await installPrompt.userChoice;
            // O evento appinstalled confirma a instalação. Removemos o prompt
            // também em caso de recusa, pois o navegador fornecerá outro quando
            // voltar a permitir a solicitação.
            setInstallPrompt(null);
        } finally {
            setIsInstalling(false);
        }
    };

    if (installed || !installPrompt) return null;

    return (
        <button
            type="button"
            className="pwa-install-button"
            onClick={handleInstall}
            disabled={isInstalling}
        >
            <i className="ti ti-device-desktop-down" aria-hidden="true" />
            {isInstalling ? 'Preparando instalação...' : 'Instalar Obraly no computador'}
        </button>
    );
}
