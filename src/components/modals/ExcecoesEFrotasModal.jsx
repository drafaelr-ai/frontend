import React, { useCallback, useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { dataBR } from '../../screens/Frota/frotaFormat';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

export default function ExcecoesEFrotasModal({ isOpen, onClose, onChanged }) {
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reprocessando, setReprocessando] = useState(null);

    const carregar = useCallback(async () => {
        setLoading(true);
        try {
            const dados = await frotaApi.excecoesEfrotas();
            setEventos(Array.isArray(dados) ? dados : []);
        } catch (e) {
            logger.error('exceções e-Frotas', e);
            notify.error(e.message || 'Não foi possível carregar as exceções.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (isOpen) carregar(); }, [isOpen, carregar]);

    const reprocessar = async (evento) => {
        setReprocessando(evento.id);
        try {
            const resposta = await frotaApi.reprocessarExcecaoEfrotas(evento.id);
            if (resposta.situacao === 'importada') notify.success('Infração recuperada e adicionada à Frota.');
            else if (resposta.situacao === 'atualizada') notify.success('Evento atualizado.');
            else notify.info(resposta.motivo || 'O evento ainda precisa de revisão.');
            await carregar();
            onChanged?.(resposta);
        } catch (e) {
            logger.error('reprocessar exceção e-Frotas', e);
            notify.error(e.message || 'Não foi possível reprocessar o evento.');
        } finally {
            setReprocessando(null);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-list-details" style={{ marginRight: 8 }} />Revisar exceções e-Frotas</>}
            footer={<button className="frota-btn frota-btn-primary" onClick={onClose}>Concluir</button>}
        >
            <div className="frota-callout frota-callout-warning">
                <i className="ti ti-alert-triangle" />
                <span>Cadastre ou corrija primeiro o veículo indicado. Depois use <b>Reprocessar</b>; o mesmo evento não criará duplicidade.</span>
            </div>
            {loading ? <div className="frota-loading">Carregando…</div> : eventos.length === 0 ? (
                <div className="frota-empty"><i className="ti ti-circle-check" style={{ marginRight: 6 }} /> Nenhuma exceção pendente.</div>
            ) : (
                <div className="frota-exception-list">
                    {eventos.map(evento => (
                        <div className="frota-exception" key={evento.id}>
                            <div>
                                <div className="frota-cell-main">Evento {evento.tipo_evento || 'sem tipo'} <span className="frota-badge frota-b-warning">{evento.status}</span></div>
                                <div className="frota-cell-sub">{evento.erro || 'Aguardando revisão.'}</div>
                                <div className="frota-cell-sub">Recebido em {dataBR(evento.recebido_em?.slice(0, 10))}</div>
                            </div>
                            <button className="frota-btn frota-btn-secondary frota-btn-sm" onClick={() => reprocessar(evento)} disabled={reprocessando === evento.id}>
                                <i className="ti ti-refresh" /> {reprocessando === evento.id ? 'Reprocessando…' : 'Reprocessar'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
