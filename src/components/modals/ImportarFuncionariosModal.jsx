import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { rhApi } from '../../screens/RH/rhApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

export default function ImportarFuncionariosModal({ isOpen, onClose, onImported }) {
    const [arquivo, setArquivo] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setArquivo(null);
        setEnviando(false);
        setResultado(null);
    }, [isOpen]);

    const importar = async () => {
        if (!arquivo) { notify.warning('Selecione o arquivo .xlsx ou .csv.'); return; }
        setEnviando(true);
        try {
            const fd = new FormData();
            fd.append('arquivo', arquivo);
            const r = await rhApi.importarFuncionarios(fd);
            setResultado(r);
            if (r.criados > 0) {
                notify.success(`${r.criados} funcionário${r.criados !== 1 ? 's' : ''} importado${r.criados !== 1 ? 's' : ''}.`);
                onImported?.();
            } else {
                notify.warning('Nenhum funcionário importado — confira as colunas da planilha.');
            }
        } catch (e) {
            logger.error('importar funcionarios', e);
            notify.error(e.message || 'Erro ao importar planilha.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-file-spreadsheet" style={{ marginRight: 8 }} />Importar funcionários</>}
            footer={<>
                <button className="rh-btn rh-btn-text" onClick={onClose}>
                    {resultado ? 'Fechar' : 'Cancelar'}
                </button>
                <button className="rh-btn rh-btn-primary" onClick={importar} disabled={enviando || !arquivo}>
                    <i className="ti ti-upload" /> {enviando ? 'Importando…' : 'Importar'}
                </button>
            </>}
        >
            <div className="rh-review-banner">
                <i className="ti ti-info-circle" />
                <span>
                    Planilha <b>.xlsx</b> ou <b>.csv</b> com cabeçalho. Colunas:&nbsp;
                    <b>nome</b> e <b>categoria</b> (obrigatórias; categoria nova é criada automaticamente),
                    e opcionais <b>cpf</b>, <b>obra</b> (nome ou nº), <b>salario</b> (vazio = piso da CCT), <b>admissao</b>.
                </span>
            </div>

            <label className="rh-dropzone" style={{ cursor: 'pointer' }}>
                <i className="ti ti-file-spreadsheet" />
                <b>{arquivo ? arquivo.name : 'Clique para escolher a planilha'}</b>
                {!arquivo && <span style={{ fontSize: 12 }}>.xlsx ou .csv</span>}
                <input
                    type="file"
                    hidden
                    accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    onChange={e => setArquivo(e.target.files?.[0] || null)}
                />
            </label>

            {resultado && (
                <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span className="rh-badge rh-b-success">{resultado.criados} importados</span>
                        {resultado.ignorados > 0 && (
                            <span className="rh-badge rh-b-warning">{resultado.ignorados} ignorados</span>
                        )}
                    </div>
                    {resultado.erros?.length > 0 && (
                        <div style={{
                            maxHeight: 180, overflowY: 'auto',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)', padding: '6px 10px',
                            fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                        }}>
                            {resultado.erros.map((e, i) => (
                                <div key={i} style={{ padding: '3px 0' }}>
                                    <b>Linha {e.linha}:</b> {e.motivo}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
