import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalKeyboard } from './useModalKeyboard';
import './Modal.css';

const WIDTH_CLASS = {
    small:   'm-container--small',
    default: 'm-container--default',
    large:   'm-container--large',
    xlarge:  'm-container--xlarge',
};

const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    width = 'default',
    footer,
    hint,
    hintVariant = 'info',
    preventBackdropClose = false,
    scrollBody = false,
    id,
    children,
}) => {
    const containerRef = useRef(null);
    const titleId = `modal-${id ?? 'dialog'}-titulo`;

    useModalKeyboard(isOpen, onClose, containerRef);

    // Foco no primeiro campo interativo quando o modal abre
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            const el = containerRef.current?.querySelector(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
            );
            el?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="m-overlay"
            onClick={preventBackdropClose ? undefined : onClose}
            role="presentation"
        >
            <div
                ref={containerRef}
                className={`m-container ${WIDTH_CLASS[width] ?? WIDTH_CLASS.default}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="m-header">
                    <div className="m-header-text">
                        <h2 className="m-title" id={titleId}>{title}</h2>
                        {subtitle && <p className="m-subtitle">{subtitle}</p>}
                    </div>
                    <button className="m-close" onClick={onClose} aria-label="Fechar">
                        <i className="ti ti-x" aria-hidden="true"></i>
                    </button>
                </div>

                {/* Body */}
                <div className={`m-body${scrollBody ? ' m-body--scroll' : ''}`}>
                    {children}
                </div>

                {/* Footer — só renderiza se prop foi passada (inclusive null/false = sem footer) */}
                {footer !== undefined && (
                    <div className="m-footer">
                        {hint && (
                            <div className={`m-footer-hint${hintVariant === 'danger' ? ' m-footer-hint--danger' : ''}`}>
                                <i
                                    className={`ti ${hintVariant === 'danger' ? 'ti-alert-triangle' : 'ti-info-circle'}`}
                                    aria-hidden="true"
                                ></i>
                                <span>{hint}</span>
                            </div>
                        )}
                        <div className="m-footer-actions">
                            {footer}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
