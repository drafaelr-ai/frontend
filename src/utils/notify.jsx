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

const COLORS = {
  success: { bg: '#d1fae5', border: '#10b981', text: '#065f46', icon: '✓' },
  error:   { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '✕' },
  warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠' },
  info:    { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ' },
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
      <span style={{ fontWeight: 700, fontSize: 16 }}>{c.icon}</span>
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
        <p style={{ margin: '0 0 24px', color: '#475569' }}>{state.message}</p>
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
  top: 20,
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
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  minWidth: 320,
  maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};

const btnSecondaryStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: 14,
};

const btnPrimaryStyle = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#6366f1',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const btnDangerStyle = {
  ...btnPrimaryStyle,
  background: '#ef4444',
};
