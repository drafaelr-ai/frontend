import React, { useMemo, useState } from 'react';


function ImportModal({ budget, schedules, onClose, onImportBudget, onPreviewSpreadsheet, onConfirmSpreadsheet }) {
    const [mode, setMode] = useState('orcamento');
    const [selectedIds, setSelectedIds] = useState([]);
    const [defaults, setDefaults] = useState({
        data_inicio: '',
        data_fim: '',
        responsavel: '',
        equipe: '',
        cronograma_id: '',
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [working, setWorking] = useState(false);
    const availableItems = useMemo(
        () => budget.flatMap(stage => stage.itens.map(item => ({ ...item, etapa_nome: stage.nome }))),
        [budget]
    );

    const toggle = itemId => setSelectedIds(previous => (
        previous.includes(itemId)
            ? previous.filter(id => id !== itemId)
            : [...previous, itemId]
    ));

    const importBudget = async () => {
        if (!selectedIds.length) return;
        setWorking(true);
        try {
            await onImportBudget({
                item_ids: selectedIds,
                padroes: {
                    ...defaults,
                    cronograma_id: defaults.cronograma_id ? Number(defaults.cronograma_id) : null,
                },
            });
        } finally {
            setWorking(false);
        }
    };

    const previewFile = async () => {
        if (!file) return;
        setWorking(true);
        try {
            setPreview(await onPreviewSpreadsheet(file));
        } finally {
            setWorking(false);
        }
    };

    const confirmFile = async () => {
        if (!file) return;
        setWorking(true);
        try {
            await onConfirmSpreadsheet(file);
        } finally {
            setWorking(false);
        }
    };

    return (
        <div className="plan-modal-backdrop" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="plan-modal plan-modal--large" role="dialog" aria-modal="true" aria-labelledby="plan-import-title">
                <header className="plan-modal__header">
                    <div>
                        <span className="plan-eyebrow">Trazer atividades</span>
                        <h2 id="plan-import-title">Importar para o planejamento</h2>
                    </div>
                    <button className="plan-icon-button" onClick={onClose} aria-label="Fechar">×</button>
                </header>
                <div className="plan-segmented" role="tablist" aria-label="Fonte da importação">
                    <button role="tab" aria-selected={mode === 'orcamento'} className={mode === 'orcamento' ? 'active' : ''} onClick={() => setMode('orcamento')}>Do orçamento</button>
                    <button role="tab" aria-selected={mode === 'planilha'} className={mode === 'planilha' ? 'active' : ''} onClick={() => setMode('planilha')}>De planilha</button>
                </div>

                {mode === 'orcamento' ? (
                    <div className="plan-import-layout">
                        <div className="plan-budget-list">
                            {availableItems.length === 0 ? (
                                <div className="plan-empty plan-empty--compact">Todos os itens do orçamento já foram importados.</div>
                            ) : availableItems.map(item => (
                                <label className="plan-budget-item" key={item.id}>
                                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
                                    <span>
                                        <strong>{item.codigo || '—'} · {item.descricao}</strong>
                                        <small>{item.etapa_nome} · {item.quantidade} {item.unidade}</small>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <aside className="plan-import-defaults">
                            <h3>Complete o que falta</h3>
                            <p>O orçamento fornece serviço, quantidade e unidade. Informe quem e quando.</p>
                            <label className="plan-field"><span>Início</span><input type="date" value={defaults.data_inicio} onChange={e => setDefaults({ ...defaults, data_inicio: e.target.value })} /></label>
                            <label className="plan-field"><span>Fim</span><input type="date" min={defaults.data_inicio || undefined} value={defaults.data_fim} onChange={e => setDefaults({ ...defaults, data_fim: e.target.value })} /></label>
                            <label className="plan-field"><span>Responsável</span><input value={defaults.responsavel} onChange={e => setDefaults({ ...defaults, responsavel: e.target.value })} /></label>
                            <label className="plan-field"><span>Equipe</span><input value={defaults.equipe} onChange={e => setDefaults({ ...defaults, equipe: e.target.value })} /></label>
                            <label className="plan-field">
                                <span>Cronograma</span>
                                <select value={defaults.cronograma_id} onChange={e => setDefaults({ ...defaults, cronograma_id: e.target.value })}>
                                    <option value="">Sem vínculo</option>
                                    {schedules.map(schedule => <option key={schedule.id} value={schedule.id}>{schedule.servico_nome}</option>)}
                                </select>
                            </label>
                        </aside>
                    </div>
                ) : (
                    <div className="plan-spreadsheet">
                        <div className="plan-upload-zone">
                            <i className="ti ti-file-spreadsheet" aria-hidden="true" />
                            <strong>Selecione um CSV ou XLSX</strong>
                            <span>Até 2 MB e 500 atividades. A coluna Atividade é obrigatória.</span>
                            <input type="file" accept=".csv,.xlsx" onChange={e => { setFile(e.target.files?.[0] || null); setPreview(null); }} />
                            {file ? <small>{file.name}</small> : null}
                        </div>
                        {preview ? (
                            <div className="plan-preview">
                                <h3>{preview.total} atividade(s) pronta(s) para importar</h3>
                                {preview.preview.slice(0, 5).map((item, index) => (
                                    <div key={`${item.titulo}-${index}`}><strong>{item.titulo}</strong><span>{item.data_inicio || 'Sem data'} · {item.responsavel || 'Sem responsável'}</span></div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                )}

                <footer className="plan-modal__footer">
                    <button className="plan-button plan-button--secondary" onClick={onClose}>Cancelar</button>
                    {mode === 'orcamento' ? (
                        <button className="plan-button plan-button--primary" disabled={!selectedIds.length || working} onClick={importBudget}>
                            {working ? 'Importando…' : `Importar ${selectedIds.length || ''} item(ns)`}
                        </button>
                    ) : preview ? (
                        <button className="plan-button plan-button--primary" disabled={working} onClick={confirmFile}>{working ? 'Importando…' : 'Confirmar importação'}</button>
                    ) : (
                        <button className="plan-button plan-button--primary" disabled={!file || working} onClick={previewFile}>{working ? 'Validando…' : 'Validar planilha'}</button>
                    )}
                </footer>
            </section>
        </div>
    );
}

export default ImportModal;
