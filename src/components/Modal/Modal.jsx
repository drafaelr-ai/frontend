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
    embedded = false,
    id,
    children,
}) => {
    const containerRef = useRef(null);
    const titleId = `modal-${id ?? 'dialog'}-titulo`;

    // Embutido na página não é diálogo: Esc não "fecha" (não há o que fechar) e
    // não há foco a prender. Chamar o hook com isOpen=false o deixa inerte.
    useModalKeyboard(isOpen && !embedded, onClose, containerRef);

    // Foco no primeiro campo interativo quando o modal abre
    useEffect(() => {
        // Embutido, roubar o foco para o primeiro campo faria a página pular
        // para o meio do conteúdo ao trocar de aba.
        if (!isOpen || embedded) return;
        const timer = setTimeout(() => {
            const el = containerRef.current?.querySelector(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
            );
            el?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, [isOpen, embedded]);

    if (!isOpen) return null;

    const corpo = (
        <div
            ref={containerRef}
            className={`m-container ${embedded
                ? 'm-container--embedded'
                : (WIDTH_CLASS[width] ?? WIDTH_CLASS.default)}`}
            // Embutido é conteúdo de página, não diálogo: sem role="dialog" nem
            // aria-modal, que anunciariam ao leitor de tela que o resto da
            // página está inacessível quando não está.
            role={embedded ? undefined : 'dialog'}
            aria-modal={embedded ? undefined : 'true'}
            aria-labelledby={titleId}
            onClick={embedded ? undefined : (e => e.stopPropagation())}
        >
            {/* Header */}
            <div className="m-header">
                <div className="m-header-text">
                    <h2 className="m-title" id={titleId}>{title}</h2>
                    {subtitle && <p className="m-subtitle">{subtitle}</p>}
                </div>
                {/* Embutido, quem fecha é a navegação da página (o botão de
                    voltar), não um X dentro do conteúdo. */}
                {!embedded && (
                    <button className="m-close" onClick={onClose} aria-label="Fechar">
                        <i className="ti ti-x" aria-hidden="true"></i>
                    </button>
                )}
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
    );

    // Embutido fica onde o componente foi renderizado, dentro do fluxo da
    // página: sem portal para o body, sem overlay e sem fundo escurecido.
    // O ObraDetalhe já renderiza estes componentes no slot de página e passava
    // embedded={true} desde sempre — a prop só não era lida por ninguém, então
    // a tela mostrava um modal por cima da página em vez da página.
    if (embedded) return corpo;

    return createPortal(
        <div
            className="m-overlay"
            onClick={preventBackdropClose ? undefined : onClose}
            role="presentation"
        >
            {corpo}
        </div>,
        document.body
    );
};

export default Modal;
