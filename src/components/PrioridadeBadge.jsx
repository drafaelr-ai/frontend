import React from 'react';

const PrioridadeBadge = ({ prioridade }) => {
    let p = parseInt(prioridade, 10) || 0;
    if (p === 0) {
        return <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>-</span>;
    }

    let color = 'var(--status-neutral)'; // 1-2 (Baixa)
    if (p === 3) color = 'var(--status-info)'; // 3 (Média)
    if (p === 4) color = 'var(--status-warning)'; // 4 (Alta)
    if (p === 5) color = 'var(--status-danger)'; // 5 (Urgente)

    const style = {
        backgroundColor: color,
        color: 'white',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '10px',
        textAlign: 'center'
    };
    return <span style={style}>{p}</span>;
};

export default PrioridadeBadge;
