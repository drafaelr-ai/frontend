import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { placaBR } from '../../screens/Frota/frotaFormat';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const MAX_VEICULOS_POR_SINCRONIZACAO = 5;

function isoLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function periodoInicial() {
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setFullYear(inicio.getFullYear() - 1);
    return isoLocal(inicio);
}

export default function SincronizarInfracoesModal({ isOpen, veiculos, onClose, onSynced }) {
    const [inicio, setInicio] = useState(periodoInicial);
    const [fim, setFim] = useState(() => isoLocal(new Date()));
    const [selecionados, setSelecionados] = useState([]);
    const [sincronizando, setSincronizando] = useState(false);
    const [resultado, setResultado] = useState(null);

    const ids = useMemo(() => veiculos.map(v => String(v.id)), [veiculos]);
    const idsSelecaoRapida = useMemo(
        () => ids.slice(0, MAX_VEICULOS_POR_SINCRONIZACAO), [ids],
    );
    const todos = idsSelecaoRapida.length > 0 && idsSelecaoRapida.every(id => selecionados.includes(id));

    useEffect(() => {
        if (!isOpen) return;
        setInicio(periodoInicial());
        setFim(isoLocal(new Date()));
        setSelecionados(veiculos.slice(0, MAX_VEICULOS_POR_SINCRONIZACAO).map(v => String(v.id)));
        setResultado(null);
    }, [isOpen]); // a seleção é iniciada apenas ao abrir o modal

    const alternarVeiculo = (id) => {
        setSelecionados(atual => {
            if (atual.includes(id)) return atual.filter(item => item !== id);
            if (atual.length >= MAX_VEICULOS_POR_SINCRONIZACAO) {
                notify.warning(`Selecione no máximo ${MAX_VEICULOS_POR_SINCRONIZACAO} veículos por vez.`);
                return atual;
            }
            return [...atual, id];
        });
    };

    const sincronizar = async () => {
        if (!inicio || !fim) { notify.warning('Informe o período da consulta.'); return; }
        if (fim < inicio) { notify.warning('A data final não pode ser anterior à inicial.'); return; }
        const dias = Math.round((Date.parse(`${fim}T00:00:00`) - Date.parse(`${inicio}T00:00:00`)) / 86400000);
        if (dias > 366) { notify.warning('Consulte no máximo um ano por vez.'); return; }
        if (!selecionados.length) { notify.warning('Selecione ao menos um veículo.'); return; }
        if (selecionados.length > MAX_VEICULOS_POR_SINCRONIZACAO) {
            notify.warning(`Selecione no máximo ${MAX_VEICULOS_POR_SINCRONIZACAO} veículos por vez.`);
            return;
        }
        setSincronizando(true);
        setResultado(null);
        try {
            const resposta = await frotaApi.sincronizarInfracoes({
                data_inicio: inicio,
                data_fim: fim,
                veiculo_ids: selecionados.map(Number),
            });
            setResultado(resposta);
            notify.success(`${resposta.importadas || 0} infração(ões) importada(s).`);
            onSynced?.(resposta);
        } catch (e) {
            logger.error('sincronizar infrações e-Frotas', e);
            notify.error(e.message || 'Não foi possível sincronizar as infrações.');
        } finally {
            setSincronizando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<><i className="ti ti-refresh" style={{ marginRight: 8 }} />Atualizar infrações</>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose} disabled={sincronizando}>Fechar</button>
                <button className="frota-btn frota-btn-primary" onClick={sincronizar} disabled={sincronizando}>
                    <i className="ti ti-download" /> {sincronizando ? 'Consultando e-Frotas…' : 'Buscar infrações'}
                </button>
            </>}
        >
            <div className="frota-callout frota-callout-info">
                <i className="ti ti-info-circle" />
                <span>A consulta é feita com segurança pela API, em lotes de até <b>{MAX_VEICULOS_POR_SINCRONIZACAO} veículos</b> e um período de até um ano. O e-Frotas retorna infrações <b>pendentes</b>; multas quitadas ou canceladas já existentes permanecem no histórico manual/CSV.</span>
            </div>
            <div className="frota-row2">
                <div className="frota-field">
                    <label>De</label>
                    <input className="frota-inp" type="date" value={inicio} max={fim} onChange={e => setInicio(e.target.value)} />
                </div>
                <div className="frota-field">
                    <label>Até</label>
                    <input className="frota-inp" type="date" value={fim} min={inicio} max={isoLocal(new Date())} onChange={e => setFim(e.target.value)} />
                </div>
            </div>
            <div className="frota-field">
                <label>Veículos para consultar</label>
                <button type="button" className="frota-select-all" onClick={() => setSelecionados(todos ? [] : idsSelecaoRapida)}>
                    <i className={`ti ${todos ? 'ti-square-check' : 'ti-square'}`} />
                    {todos ? 'Desmarcar todos' : `Selecionar até ${MAX_VEICULOS_POR_SINCRONIZACAO}`}
                </button>
                <div className="frota-check-list">
                    {veiculos.map(v => {
                        const id = String(v.id);
                        return (
                            <label key={v.id} className="frota-check-item">
                                <input type="checkbox" checked={selecionados.includes(id)} onChange={() => alternarVeiculo(id)} />
                                <span><b>{placaBR(v.placa)}</b> — {v.marca ? `${v.marca} ` : ''}{v.modelo}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
            {resultado && (
                <div className="frota-sync-result">
                    <div><i className="ti ti-circle-check" /> Consulta concluída</div>
                    <span>{resultado.importadas || 0} novas</span>
                    <span>{resultado.atualizadas || 0} atualizadas</span>
                    <span>{resultado.duplicadas || 0} já existentes</span>
                    {!!resultado.ignoradas && <span>{resultado.ignoradas} para revisar</span>}
                    {!!resultado.erros && <span>{resultado.erros} falha(s)</span>}
                </div>
            )}
        </Modal>
    );
}
