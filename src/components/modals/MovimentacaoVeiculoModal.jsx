import React, { useEffect, useState } from 'react';
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
    const emObra = veiculo?.local_tipo === 'obra';
    const operacao = emObra && destino === 'sem_local'
        ? 'retorno_obra'
        : !emObra && destino === 'obra'
            ? 'cessao_obra'
            : 'movimentacao';

    useEffect(() => {
        if (!isOpen) return;
        setDestino(veiculo?.local_tipo === 'obra' ? 'sem_local' : 'obra');
        setObraId('');
        setImovelId('');
        setData(new Date().toISOString().slice(0, 10));
        setObservacao('');
    }, [isOpen, veiculo?.local_tipo]);

    const salvar = async () => {
        if (destino === 'obra' && !obraId) { notify.warning('Selecione a obra de destino.'); return; }
        if (destino === 'imovel' && !imovelId) { notify.warning('Selecione o imovel de destino.'); return; }
        setSalvando(true);
        try {
            const body = {
                destino_tipo: destino,
                operacao,
                data_movimentacao: data || null,
                observacao: observacao.trim() || null,
            };
            if (destino === 'obra') body.obra_id = obraId;
            if (destino === 'imovel') {
                const imovel = imoveis.find(item => String(item.id) === String(imovelId));
                body.imovel_id = imovelId;
                body.imovel_nome = imovel?.nome || null;
            }
            await frotaApi.criarMovimentacao(veiculo.id, body);
            notify.success(
                operacao === 'cessao_obra'
                    ? 'Veiculo cedido a obra.'
                    : operacao === 'retorno_obra'
                        ? 'Veiculo retornado ao patio central.'
                        : 'Veiculo movimentado.',
            );
            onSaved?.();
        } catch (error) {
            logger.error('mover veiculo', error);
            notify.error(error.message || 'Erro ao movimentar veiculo.');
        } finally {
            setSalvando(false);
        }
    };

    const titulo = emObra ? 'Retornar veiculo da obra' : 'Ceder veiculo para obra';
    const botaoConfirmacao = operacao === 'cessao_obra'
        ? 'Confirmar cessao'
        : operacao === 'retorno_obra'
            ? 'Confirmar retorno'
            : 'Confirmar movimentacao';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-route" style={{ marginRight: 8 }} />{titulo} {veiculo ? placaBR(veiculo.placa) : 'veiculo'}</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando...' : botaoConfirmacao}
                </button>
            </>}
        >
            <div className="frota-field">
                <label>Destino</label>
                <div className="frota-destino">
                    <button type="button" className={`frota-destino-opt${destino === 'obra' ? ' active' : ''}`} onClick={() => setDestino('obra')}>
                        <i className="ti ti-building" /> Ceder para obra
                    </button>
                    <button type="button" className={`frota-destino-opt${destino === 'imovel' ? ' active' : ''}`} onClick={() => setDestino('imovel')}>
                        <i className="ti ti-home" /> Imovel do patrimonio
                    </button>
                    <button type="button" className={`frota-destino-opt${destino === 'sem_local' ? ' active' : ''}`} onClick={() => setDestino('sem_local')}>
                        <i className="ti ti-warehouse" /> Retornar ao patio
                    </button>
                </div>
                {destino === 'obra' && (
                    <select className="frota-inp" value={obraId} onChange={event => setObraId(event.target.value)}>
                        <option value="">Selecione a obra...</option>
                        {obras.map(obra => <option key={obra.id} value={obra.id}>{obra.nome}{obra.uf ? ` (${obra.uf})` : ''}</option>)}
                    </select>
                )}
                {destino === 'imovel' && (
                    imoveis.length
                        ? <select className="frota-inp" value={imovelId} onChange={event => setImovelId(event.target.value)}>
                            <option value="">Selecione o imovel...</option>
                            {imoveis.map(imovel => <option key={imovel.id} value={imovel.id}>{imovel.nome}{imovel.cidade ? ` - ${imovel.cidade}` : ''}</option>)}
                        </select>
                        : <div className="frota-hint"><i className="ti ti-plug-off" /> Lista de imoveis do patrimonio indisponivel no momento.</div>
                )}
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label>Data</label>
                    <input className="frota-inp" type="date" value={data} onChange={event => setData(event.target.value)} /></div>
                <div className="frota-field"><label>Observacao (opcional)</label>
                    <input className="frota-inp" placeholder="Ex.: uso na etapa de fundacao" value={observacao} onChange={event => setObservacao(event.target.value)} /></div>
            </div>
            <div className="frota-hint"><i className="ti ti-info-circle" /> Como um equipamento cedido, o veiculo fica vinculado a obra enquanto estiver em uso. Os custos novos contam no local atual; os anteriores permanecem no local antigo.</div>
        </Modal>
    );
}
