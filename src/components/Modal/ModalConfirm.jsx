import React from 'react';
import Modal from './Modal';

const ModalConfirm = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    detail,
    confirmLabel = 'Confirmar',
    destructive = false,
    loading = false,
}) => (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        width="small"
        hint={destructive ? 'Esta ação não pode ser desfeita' : undefined}
        hintVariant={destructive ? 'danger' : 'info'}
        footer={
            <>
                <button className="m-btn-cancel" onClick={onClose} disabled={loading}>
                    Cancelar
                </button>
                <button
                    className={`m-btn-primary${destructive ? ' m-btn-primary--danger' : ''}`}
                    onClick={onConfirm}
                    disabled={loading}
                >
                    <i
                        className={`ti ${destructive ? 'ti-trash' : 'ti-check'}`}
                        aria-hidden="true"
                    ></i>
                    {loading ? 'Aguarde...' : confirmLabel}
                </button>
            </>
        }
    >
        <div className="m-confirm-body">
            {destructive && (
                <div className="m-confirm-icon">
                    <i className="ti ti-alert-triangle" aria-hidden="true"></i>
                </div>
            )}
            <p className="m-confirm-message">{message}</p>
            {detail && <p className="m-confirm-detail">{detail}</p>}
        </div>
    </Modal>
);

export default ModalConfirm;
