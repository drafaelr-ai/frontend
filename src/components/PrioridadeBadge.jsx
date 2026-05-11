import React from 'react';

const PrioridadeBadge = ({ prioridade }) => {
    let p = parseInt(prioridade, 10) || 0;
    if (p === 0) {
        return <span style={{ color: '#aaa', fontSize: '0.9em' }}>-</span>;
    }

    let color = '#6c757d'; // 1-2 (Baixa)
    if (p === 3) color = '#007bff'; // 3 (Média)
    if (p === 4) color = '#ffc107'; // 4 (Alta)
    if (p === 5) color = '#dc3545'; // 5 (Urgente)

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
