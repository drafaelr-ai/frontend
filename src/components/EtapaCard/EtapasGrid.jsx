import React, { useMemo } from 'react';
import EtapaCard from './EtapaCard';
import './EtapaCard.css';

const STATUS_LABELS = {
    todos: 'Todos',
    a_iniciar: 'A Iniciar',
    em_andamento: 'Em Andamento',
    atrasado: 'Atrasado',
    concluido: 'Concluído',
};

function getStatusKey(servico) {
    const pct = servico.percentual_conclusao || 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = servico.data_fim_prevista
        ? new Date(servico.data_fim_prevista + 'T00:00:00')
        : null;
    if (pct >= 100) return 'concluido';
    if (dataFim && hoje > dataFim) return 'atrasado';
    if (servico.data_inicio_real || pct > 0) return 'em_andamento';
    return 'a_iniciar';
}

const EtapasGrid = ({ servicos = [], evmData = {}, filtroStatus = 'todos', onEdit }) => {
    const filtrados = useMemo(() => {
        if (filtroStatus === 'todos') return servicos;
        return servicos.filter(s => getStatusKey(s) === filtroStatus);
    }, [servicos, filtroStatus]);

    const contagens = useMemo(() => {
        const counts = { todos: servicos.length, a_iniciar: 0, em_andamento: 0, atrasado: 0, concluido: 0 };
        servicos.forEach(s => { counts[getStatusKey(s)]++; });
        return counts;
    }, [servicos]);

    if (servicos.length === 0) {
        return (
            <div className="etapas-grid__empty">
                <i className="ti ti-layout-grid" aria-hidden="true" />
                <p>Nenhum serviço cadastrado.</p>
                <span>Adicione serviços ao cronograma para visualizá-los aqui.</span>
            </div>
        );
    }

    return (
        <div className="etapas-grid">
            <div className="etapas-grid__chips" role="tablist" aria-label="Filtrar por status">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={filtroStatus === key}
                        className={`etapas-grid__chip${filtroStatus === key ? ' etapas-grid__chip--active' : ''}`}
                        onClick={() => onEdit && onEdit.__setFiltro && onEdit.__setFiltro(key)}
                    >
                        {label}
                        <span className="etapas-grid__chip-count">{contagens[key]}</span>
                    </button>
                ))}
            </div>

            {filtrados.length === 0 ? (
                <div className="etapas-grid__empty-filter">
                    <i className="ti ti-filter-off" aria-hidden="true" />
                    <p>Nenhum serviço com status "{STATUS_LABELS[filtroStatus]}".</p>
                </div>
            ) : (
                <div className="etapas-grid__cards">
                    {filtrados.map(servico => (
                        <EtapaCard
                            key={servico.id}
                            servico={servico}
                            evmData={evmData}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default EtapasGrid;
