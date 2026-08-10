import React, { useState, useMemo, useRef } from 'react';
import { buscarInsumos } from './insumosCatalogo';

/**
 * Input de descrição de item com autopreenchimento pelo catálogo de insumos.
 * Texto livre continua valendo — selecionar uma sugestão só acelera (e traz a
 * unidade padrão via onSelect).
 */
export default function InsumoAutocomplete({ value, onChange, onSelect, placeholder, className = '' }) {
    const [aberto, setAberto] = useState(false);
    const [ativo, setAtivo] = useState(-1);
    const blurTimer = useRef(null);

    const sugestoes = useMemo(() => (aberto ? buscarInsumos(value) : []), [aberto, value]);
    const visivel = aberto && sugestoes.length > 0;

    const escolher = (item) => {
        setAberto(false);
        setAtivo(-1);
        onSelect(item);
    };

    const onKeyDown = (e) => {
        if (!visivel) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAtivo(i => (i + 1) % sugestoes.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAtivo(i => (i <= 0 ? sugestoes.length - 1 : i - 1));
        } else if (e.key === 'Enter') {
            if (ativo >= 0) { e.preventDefault(); escolher(sugestoes[ativo]); }
        } else if (e.key === 'Escape') {
            setAberto(false);
            setAtivo(-1);
        }
    };

    return (
        <div className={`solc-ac${className ? ` ${className}` : ''}`}>
            <input
                className="solc-inp"
                placeholder={placeholder}
                value={value}
                onChange={e => { onChange(e.target.value); setAberto(true); setAtivo(-1); }}
                onFocus={() => setAberto(true)}
                onBlur={() => { blurTimer.current = setTimeout(() => setAberto(false), 150); }}
                onKeyDown={onKeyDown}
                autoComplete="off"
            />
            {visivel && (
                <div className="solc-ac-list" onMouseDown={() => clearTimeout(blurTimer.current)}>
                    {sugestoes.map((item, i) => (
                        <button
                            type="button"
                            key={`${item.descricao}-${i}`}
                            className={`solc-ac-item${i === ativo ? ' ativo' : ''}`}
                            onMouseEnter={() => setAtivo(i)}
                            onClick={() => escolher(item)}
                        >
                            <span className="solc-ac-desc">{item.descricao}</span>
                            <span className="solc-ac-meta">{item.categoria} · {item.unidade}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
