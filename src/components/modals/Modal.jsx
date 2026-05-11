import React from 'react';

const Modal = ({ children, onClose, customWidth }) => (
    <div className="modal-overlay" onClick={onClose} style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '10px',
        overflowY: 'auto'
    }}>
        <div
            className="modal-content"
            style={{
                maxWidth: customWidth || '500px',
                width: '95%',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '12px',
                position: 'relative',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="close-modal-btn">&times;</button>
            {children}
        </div>
    </div>
);

export default Modal;
