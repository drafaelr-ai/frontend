import React from 'react';
import './ModuleBackButton.css';

export default function ModuleBackButton({ onClick, tone = 'dark', className = '' }) {
    return (
        <button
            type="button"
            className={`module-back-button module-back-button--${tone}${className ? ` ${className}` : ''}`}
            onClick={onClick}
            title="Voltar para a tela anterior"
            aria-label="Voltar para a tela anterior"
        >
            <i className="ti ti-arrow-left" aria-hidden="true" />
            <span className="module-action-label">Voltar</span>
        </button>
    );
}
