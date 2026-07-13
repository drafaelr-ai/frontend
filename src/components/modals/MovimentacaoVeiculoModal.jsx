import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { placaBR } from '../../screens/Frota/frotaFormat';

export default function MovimentacaoVeiculoModal({ isOpen, veiculo, obras, imoveis, onClose, onSaved }) {
    const [destino, setDestino] = useState('obra');
    const [obraId, setObraId] = useState('');
    const [imovelId, setImovelId] = useState('');
    const [data, setData] = useState('');
    const [observacao, setObservacao] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setDestino('obra');
        setObraId('');
        setImovelId('');
        setData(new Date().toISOString().slice(0, 10));
        setObservacao('');
    }, [isOpen]);

    const salvar = async () => {
        if (destino === 'obra' && !obraId) { notify.warning('Selecione a obra de destino.'); return; }
        if (destino === 'imovel' && !imovelId) { notify.warning('Selecione o imóvel de destino.'); return; }
        setSalvando(true);
        try {
            const body = { destino_tipo: destino, data_movimentacao: data || null, observacao: observacao.trim() || null };
            if (destino === 'obra') body.obra_id = obraId;
            if (destino === 'imovel') {
                const im = imoveis.find(i => String(i.id) === String(imovelId));
                body.imovel_id = imovelId;
                body.imovel_nome = im?.nome || null;
            }
            await frotaApi.criarMovimentacao(veiculo.id, body);
            notify.success('Veículo movimentado.');
            onSaved?.();
        } catch (e) {
            logger.error('mover veiculo', e);
            notify.error(e.message || 'Erro ao movimentar veículo.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-route" style={{ marginRight: 8 }} />Mover {veiculo ? placaBR(veiculo.placa) : 'veículo'}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Movendo…' : 'Confirmar movimentação'}
                </button>
            </>}
        >
            <div className="frota-field">
                <label>Destino</label>
                <div className="frota-destino">
                    <button type="button" className={`frota-destino-opt${destino === 'obra' ? ' active' : ''}`} onClick={() => setDestino('obra')}>
                        <i className="ti ti-building" /> Obra
                    </button>
                    <button type="button" className={`frota-destino-opt${destino === 'imovel' ? ' active' : ''}`} onClick={() => setDestino('imovel')}>
                        <i className="ti ti-home" /> Imóvel do patrimônio
                    </button>
                    <button type="button" className={`frota-destino-opt${destino === 'sem_local' ? ' active' : ''}`} onClick={() => setDestino('sem_local')}>
                        <i className="ti ti-minus" /> Sem local
                    </button>
                </div>
                {destino === 'obra' && (
                    <select className="frota-inp" value={obraId} onChange={e => setObraId(e.target.value)}>
                        <option value="">Selecione a obra…</option>
                        {obras.map(o => <option key={o.id} value={o.id}>{o.nome}{o.uf ? ` (${o.uf})` : ''}</option>)}
                    </select>
                )}
                {destino === 'imovel' && (
                    imoveis.length
                        ? <select className="frota-inp" value={imovelId} onChange={e => setImovelId(e.target.value)}>
                            <option value="">Selecione o imóvel…</option>
                            {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome}{i.cidade ? ` — ${i.cidade}` : ''}</option>)}
                        </select>
                        : <div className="frota-hint"><i className="ti ti-plug-off" /> Lista de imóveis do patrimônio indisponível no momento.</div>
                )}
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Data</label>
                    <input className="frota-inp" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
                <div className="frota-field"><label>Observação (opcional)</label>
                    <input className="frota-inp" placeholder="Ex.: transferido para etapa de fundação" value={observacao} onChange={e => setObservacao(e.target.value)} /></div>
            </div>
            <div className="frota-hint"><i className="ti ti-info-circle" /> Custos lançados a partir de agora passam a contar no novo local; os anteriores permanecem no local antigo.</div>
        </Modal>
    );
}
