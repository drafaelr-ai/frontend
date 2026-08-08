import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { brl, dataBR, placaBR } from '../../screens/Frota/frotaFormat';

const num = (v, casas = 2) =>
    v == null ? '—' : Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: casas, maximumFractionDigits: casas,
    });

const inteiro = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));

/** Histórico de abastecimentos de um veículo com consumo (km/l) e custo por km.
    O km/l de cada linha é medido contra o abastecimento anterior — o primeiro
    registro do veículo nunca tem consumo. */
export default function ConsumoVeiculoModal({ isOpen, veiculo, onClose }) {
    const [dados, setDados] = useState(null);   // null = carregando
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');

    const carregar = useCallback(async () => {
        if (!veiculo?.id) return;
        try {
            const params = new URLSearchParams();
            if (de) params.set('de', de);
            if (ate) params.set('ate', ate);
            const qs = params.toString();
            setDados(await frotaApi.consumoVeiculo(veiculo.id, qs ? `?${qs}` : ''));
        } catch (e) {
            logger.error('consumo do veículo', e);
            notify.error(e.message || 'Erro ao carregar o consumo.');
            setDados({ registros: [], resumo: {} });
        }
    }, [veiculo, de, ate]);

    useEffect(() => {
        if (!isOpen) return;
        carregar();
        return () => setDados(null);
    }, [isOpen, carregar]);

    const abrirComprovante = async (id) => {
        try {
            const { url } = await frotaApi.arquivoUrl('abastecimento', id);
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            notify.error(e.message || 'Erro ao abrir o comprovante.');
        }
    };

    const resumo = dados?.resumo || {};

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            width="xlarge"
            scrollBody
            title={<>
                <i className="ti ti-chart-line" style={{ marginRight: 8 }} />
                Consumo — {placaBR(veiculo?.placa)} {veiculo?.modelo || ''}
            </>}
            footer={<button className="frota-btn frota-btn-primary" onClick={onClose}>Fechar</button>}
        >
            <div className="frota-card-actions" style={{ marginBottom: 'var(--space-4)' }}>
                <input className="frota-inp" type="date" style={{ maxWidth: 160 }}
                    value={de} onChange={e => setDe(e.target.value)} title="De" />
                <input className="frota-inp" type="date" style={{ maxWidth: 160 }}
                    value={ate} onChange={e => setAte(e.target.value)} title="Até" />
                {(de || ate) && (
                    <button className="frota-btn frota-btn-text frota-btn-sm"
                        onClick={() => { setDe(''); setAte(''); }}>
                        <i className="ti ti-x" /> Limpar período
                    </button>
                )}
            </div>

            {dados == null ? <div className="frota-loading">Carregando…</div> : (
                <>
                    <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="frota-kpi accent">
                            <div className="frota-kpi-lbl"><i className="ti ti-gauge" /> Consumo médio</div>
                            <div className="frota-kpi-val">
                                {resumo.consumo_medio_km_l != null ? `${num(resumo.consumo_medio_km_l)} km/l` : '—'}
                            </div>
                        </div>
                        <div className="frota-kpi">
                            <div className="frota-kpi-lbl"><i className="ti ti-road" /> Custo por km</div>
                            <div className="frota-kpi-val">
                                {resumo.custo_por_km != null ? brl(resumo.custo_por_km) : '—'}
                            </div>
                        </div>
                        <div className="frota-kpi">
                            <div className="frota-kpi-lbl"><i className="ti ti-droplet" /> Litros no período</div>
                            <div className="frota-kpi-val">{num(resumo.total_litros)} L</div>
                        </div>
                        <div className="frota-kpi">
                            <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Gasto no período</div>
                            <div className="frota-kpi-val">{brl(resumo.total_valor || 0)}</div>
                        </div>
                    </div>

                    {resumo.melhor_consumo_km_l != null && (
                        <div className="frota-hint">
                            <i className="ti ti-arrows-up-down" />
                            Melhor: <b>{num(resumo.melhor_consumo_km_l)} km/l</b> · Pior:{' '}
                            <b>{num(resumo.pior_consumo_km_l)} km/l</b> ·{' '}
                            {inteiro(resumo.km_rodados)} km rodados em{' '}
                            {resumo.abastecimentos} abastecimento(s) ·
                            preço médio {resumo.preco_medio_litro != null
                                ? `${brl(resumo.preco_medio_litro)}/L` : '—'}
                        </div>
                    )}

                    <table className="frota-table" style={{ marginTop: 'var(--space-4)' }}>
                        <thead>
                            <tr>
                                <th>Data</th><th>KM</th><th>Rodados</th><th>Litros</th>
                                <th>km/l</th><th>R$/L</th><th>Posto</th><th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(dados.registros || []).length === 0 && (
                                <tr><td colSpan={8} className="frota-empty">
                                    Nenhum abastecimento no período.
                                </td></tr>
                            )}
                            {(dados.registros || []).map(a => (
                                <tr key={a.id}>
                                    <td className="frota-muted">
                                        {dataBR(a.data)}
                                        {a.origem === 'superlink' && (
                                            <div className="frota-cell-sub">
                                                <i className="ti ti-link" /> pelo motorista
                                            </div>
                                        )}
                                    </td>
                                    <td className="frota-muted">{inteiro(a.km)}</td>
                                    <td className="frota-muted">{a.km_rodados ? `${inteiro(a.km_rodados)} km` : '—'}</td>
                                    <td className="frota-muted">{a.litros != null ? `${num(a.litros)} L` : '—'}</td>
                                    <td className="frota-cell-main">
                                        {a.consumo_km_l != null ? num(a.consumo_km_l) : '—'}
                                    </td>
                                    <td className="frota-muted">
                                        {a.preco_litro != null ? brl(a.preco_litro) : '—'}
                                    </td>
                                    <td className="frota-muted">
                                        {a.posto || '—'}
                                        {a.tem_comprovante && (
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Ver comprovante"
                                                onClick={() => abrirComprovante(a.id)}>
                                                <i className="ti ti-paperclip" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="frota-valor">{brl(a.valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="frota-hint">
                        <i className="ti ti-info-circle" /> O km/l de cada linha usa a distância desde o
                        abastecimento anterior dividida pelos litros desta vez — supõe tanque cheio.
                        Sem KM anotado, a linha não entra no cálculo.
                    </div>
                </>
            )}
        </Modal>
    );
}
