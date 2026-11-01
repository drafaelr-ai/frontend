// frontend/src/utils/notify.jsx
//
// Sistema de notificações (toast) e confirmação para substituir
// alert()/confirm() nativos.
//
// USO:
//
//   import { notify, confirmDialog } from './utils/notify';
//
//   notify.success('Salvo com sucesso');
//   notify.error('Erro ao salvar');
//   notify.warning('Verifique os campos');
//   notify.info('Processando...');
//
//   const ok = await confirmDialog('Deseja realmente excluir?');
//   if (ok) { ... }
//
// INSTALAÇÃO:
//
// 1. Adicione <ToastContainer /> uma única vez na raiz do App (em App()):
//
//      import { ToastContainer } from './utils/notify';
//      ...
//      return (
//        <>
//          <ToastContainer />
//          {/* resto do app */}
//        </>
//      );

import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Estado global simples (sem dependência externa) usando event emitter
// ---------------------------------------------------------------------------

const listeners = new Set();
let nextId = 1;

function emit(toast) {
  listeners.forEach((fn) => fn(toast));
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export const notify = {
  success: (msg, opts = {}) =>
    emit({ id: nextId++, type: 'success', message: msg, ...opts }),
  error: (msg, opts = {}) =>
    emit({ id: nextId++, type: 'error', message: msg, duration: 6000, ...opts }),
  warning: (msg, opts = {}) =>
    emit({ id: nextId++, type: 'warning', message: msg, ...opts }),
  info: (msg, opts = {}) =>
    emit({ id: nextId++, type: 'info', message: msg, ...opts }),
};

// Para uso em código não-React (ex: dentro de fetchWithAuth)
export function showToast(type, msg, opts = {}) {
  emit({ id: nextId++, type, message: msg, ...opts });
}

// ---------------------------------------------------------------------------
// confirmDialog — substituto async para window.confirm()
// ---------------------------------------------------------------------------

let confirmResolver = null;
const confirmListeners = new Set();

export function confirmDialog(message, opts = {}) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmListeners.forEach((fn) =>
      fn({
        message,
        title: opts.title || 'Confirmar',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        danger: opts.danger || false,
      })
    );
  });
}

// ---------------------------------------------------------------------------
// Componente: ToastContainer (renderiza todos os toasts)
// ---------------------------------------------------------------------------

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  // Escuta toasts
  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev, toast]);
      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, duration);
      }
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  // Escuta confirmações
  useEffect(() => {
    const handler = (state) => setConfirmState(state);
    confirmListeners.add(handler);
    return () => confirmListeners.delete(handler);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleConfirm = useCallback((value) => {
    setConfirmState(null);
    if (confirmResolver) {
      confirmResolver(value);
      confirmResolver = null;
    }
  }, []);

  return (
    <>
      {/* Pilha de toasts (canto superior direito) */}
      <div style={toastStackStyle}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => dismissToast(toast.id)} />
        ))}
      </div>

      {/* Modal de confirmação (sobreposto a tudo) */}
      {confirmState && (
        <ConfirmModal state={confirmState} onConfirm={handleConfirm} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes (estilo inline simples — depois fase 6 pode migrar pra CSS)
// ---------------------------------------------------------------------------

// Cores dos tokens, nao hex: a convencao proibe hex fora de tokens.css, e
// aqui os valores eram copias dos proprios tokens (#d1fae5 == --status-success-bg).
// Icone em Tabler, nao glifo: o glifo muda de forma por fonte e sistema.
const COLORS = {
  success: {
    bg: 'var(--status-success-bg)', border: 'var(--status-success)',
    text: 'var(--status-success-text)', icon: 'ti-circle-check',
  },
  error: {
    bg: 'var(--status-danger-bg)', border: 'var(--status-danger)',
    text: 'var(--status-danger-text)', icon: 'ti-alert-circle',
  },
  warning: {
    bg: 'var(--status-warning-bg)', border: 'var(--status-warning)',
    text: 'var(--status-warning-text)', icon: 'ti-alert-triangle',
  },
  info: {
    bg: 'var(--status-info-bg)', border: 'var(--status-info)',
    text: 'var(--status-info-text)', icon: 'ti-info-circle',
  },
};

function Toast({ toast, onClose }) {
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: '12px 16px',
        borderRadius: 8,
        marginBottom: 8,
        minWidth: 280,
        maxWidth: 420,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        fontSize: 14,
        animation: 'obraly-toast-in 0.25s ease-out',
      }}
      role="alert"
    >
      <i className={`ti ${c.icon}`} style={{ fontSize: 18, lineHeight: 1 }} aria-hidden="true" />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Fechar notificação"
        style={{
          background: 'transparent',
          border: 'none',
          color: c.text,
          cursor: 'pointer',
          fontSize: 18,
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function ConfirmModal({ state, onConfirm }) {
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={confirmBoxStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{state.title}</h3>
        <p style={{ margin: '0 0 24px', color: 'var(--text-muted)' }}>{state.message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => onConfirm(false)} style={btnSecondaryStyle}>
            {state.cancelText}
          </button>
          <button
            onClick={() => onConfirm(true)}
            style={state.danger ? btnDangerStyle : btnPrimaryStyle}
          >
            {state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const toastStackStyle = {
  position: 'fixed',
  // Safe area do iOS (env = 0 nas demais plataformas)
  top: 'calc(20px + env(safe-area-inset-top, 0px))',
  right: 20,
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 99998,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const confirmBoxStyle = {
  background: 'var(--surface-card)',
  borderRadius: 12,
  padding: 24,
  minWidth: 320,
  maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const btnSecondaryStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid var(--border-default)',
  background: 'var(--surface-card)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 14,
};

const btnPrimaryStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--brand-primary)',
  color: 'var(--text-on-dark)',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const btnDangerStyle = {
  ...btnPrimaryStyle,
  background: 'var(--status-danger)',
};
