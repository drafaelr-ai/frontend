import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { UPDATE_EVENT, applyUpdate } from './serviceWorkerRegistration';
import { isIOS, isStandalone } from './platform';
import './pwa.css';

// Montado uma única vez na raiz (index.js), fora do fluxo de autenticação:
// conectividade, atualização de versão e instalação valem em qualquer tela.
export default function PwaExtras() {
    return (
        <>
            <OfflineBanner />
            <UpdateToast />
            <InstallHint />
        </>
    );
}

/* ── FASE 4.1 — estado offline ──────────────────────────────
   Banner discreto (não modal): quem está no canteiro perde sinal o tempo
   todo e não pode ser interrompido por bloqueio de tela. */

function OfflineBanner() {
    const [offline, setOffline] = useState(!navigator.onLine);
    const [recovered, setRecovered] = useState(false);

    useEffect(() => {
        let timer;
        const goOffline = () => {
            window.clearTimeout(timer);
            setOffline(true);
            setRecovered(false);
        };
        const goOnline = () => {
            setOffline(false);
            setRecovered(true);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setRecovered(false), 3000);
        };
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    if (!offline && !recovered) return null;

    if (offline) {
        return (
            <div className="pwa-offline-banner" role="status">
                <i className="ti ti-wifi-off" aria-hidden="true" />
                <span>Sem conexão — mostrando o que já estava na tela.</span>
            </div>
        );
    }

    return (
        <div className="pwa-offline-banner pwa-offline-banner--ok" role="status">
            <i className="ti ti-wifi" aria-hidden="true" />
            <span>Conexão restabelecida.</span>
        </div>
    );
}

/* Estado offline de tela cheia, reutilizável por telas que falharem ao
   carregar dados por falta de rede. */
export function OfflineState({ onRetry }) {
    return (
        <div className="pwa-offline-state">
            <i className="ti ti-cloud-off" aria-hidden="true" />
            <h2>Sem conexão</h2>
            <p>Não foi possível carregar os dados. Verifique a internet e tente novamente.</p>
            <button type="button" onClick={onRetry || (() => window.location.reload())}>
                <i className="ti ti-refresh" aria-hidden="true" /> Tentar novamente
            </button>
        </div>
    );
}

/* ── FASE 4.2 — atualização de versão ───────────────────────
   Nunca automática: atualização forçada no meio de um lançamento financeiro
   perderia o formulário. O controle é do usuário. */

function UpdateToast() {
    const [registration, setRegistration] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const handler = (event) => setRegistration(event.detail);
        window.addEventListener(UPDATE_EVENT, handler);
        return () => window.removeEventListener(UPDATE_EVENT, handler);
    }, []);

    if (!registration || dismissed) return null;

    return (
        <div className="pwa-update-toast" role="status">
            <i className="ti ti-refresh-alert" aria-hidden="true" />
            <span>Nova versão disponível</span>
            <button type="button" className="pwa-update-btn" onClick={() => applyUpdate(registration)}>
                Atualizar
            </button>
            <button
                type="button"
                className="pwa-update-close"
                aria-label="Agora não"
                onClick={() => setDismissed(true)}
            >
                <i className="ti ti-x" aria-hidden="true" />
            </button>
        </div>
    );
}

/* ── FASE 6 — fluxo guiado de instalação (iOS não tem beforeinstallprompt) ── */

const HINT_DISMISS_KEY = 'obraly_pwa_hint_dismissed';

// Navegador embutido (WhatsApp, Instagram, Facebook…): não existe a opção
// "Adicionar à Tela de Início" — a instrução tem que mandar abrir no Safari.
function isEmbeddedBrowser() {
    return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|GSA\/|Twitter/i.test(navigator.userAgent);
}

function InstallHint() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isIOS() || isStandalone() || Capacitor.isNativePlatform()) return;
        if (localStorage.getItem(HINT_DISMISS_KEY)) return;
        // Aparece depois que a pessoa já viu a tela, não em cima do carregamento.
        const timer = window.setTimeout(() => setVisible(true), 2500);
        return () => window.clearTimeout(timer);
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        localStorage.setItem(HINT_DISMISS_KEY, String(Date.now()));
        setVisible(false);
    };

    const embedded = isEmbeddedBrowser();

    return (
        <div className="pwa-install-sheet" role="dialog" aria-label="Instalar o Obraly">
            <button type="button" className="pwa-install-close" aria-label="Dispensar" onClick={dismiss}>
                <i className="ti ti-x" aria-hidden="true" />
            </button>
            <div className="pwa-install-title">
                <img src="/logo192.png" alt="" />
                <strong>Instale o Obraly no seu iPhone</strong>
            </div>
            {embedded ? (
                <p className="pwa-install-step">
                    <i className="ti ti-brand-safari" aria-hidden="true" />
                    Abra este link no <strong>Safari</strong> para instalar — aqui dentro do
                    aplicativo não dá para adicionar à Tela de Início.
                </p>
            ) : (
                <>
                    <p className="pwa-install-step">
                        <i className="ti ti-share-2" aria-hidden="true" />
                        1. Toque em <strong>Compartilhar</strong> na barra do Safari
                    </p>
                    <p className="pwa-install-step">
                        <i className="ti ti-square-plus" aria-hidden="true" />
                        2. Toque em <strong>Adicionar à Tela de Início</strong>
                    </p>
                </>
            )}
            <button type="button" className="pwa-install-ok" onClick={dismiss}>
                Entendi
            </button>
        </div>
    );
}
