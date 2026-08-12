import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { AuthContext } from '../../auth/AuthContext';
import { frotaApi } from './frotaApi';
import { logger } from '../../utils/logger';
import { notify, confirmDialog } from '../../utils/notify';
import { brl, brlShort, dataBR, placaBR } from './frotaFormat';
import SolicitarAbastecimentoModal from '../../components/modals/SolicitarAbastecimentoModal';
import AbastecimentoModal from '../../components/modals/AbastecimentoModal';
import ConsumoVeiculoModal from '../../components/modals/ConsumoVeiculoModal';

const num = (v, casas = 2) =>
    v == null ? '—' : Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: casas, maximumFractionDigits: casas,
    });

const inteiro = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));

function statusBadge(status) {
    switch (status) {
        case 'pendente':  return { cls: 'frota-b-warning', icon: 'ti-clock', label: 'Aguardando motorista' };
        case 'concluida': return { cls: 'frota-b-success', icon: 'ti-check', label: 'Registrado' };
        case 'cancelada': return { cls: 'frota-b-neutral', icon: 'ti-ban', label: 'Cancelado' };
        case 'expirada':  return { cls: 'frota-b-danger', icon: 'ti-clock-off', label: 'Expirado' };
        default:          return { cls: 'frota-b-neutral', icon: 'ti-help', label: status || '—' };
    }
}

export default function AbastecimentosFrota({ condutores }) {
    const { user } = useContext(AuthContext) || {};
    const ehMaster = user?.role === 'master';
    const [veiculos, setVeiculos] = useState([]);
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [abastecimentos, setAbastecimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroVeiculo, setFiltroVeiculo] = useState('');
    const [de, setDe] = useState('');
    const [ate, setAte] = useState('');
    const [modalLink, setModalLink] = useState(false);
    const [modalManual, setModalManual] = useState(false);
    const [consumoVeiculo, setConsumoVeiculo] = useState(null);
    const reqIdRef = useRef(0);

    const carregar = useCallback(async () => {
        const reqId = ++reqIdRef.current;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filtroVeiculo) params.set('veiculo_id', filtroVeiculo);
            const qsSol = params.toString() ? `?${params.toString()}` : '';
            if (de) params.set('de', de);
            if (ate) params.set('ate', ate);
            const qsAbast = params.toString() ? `?${params.toString()}` : '';

            const [vRes, sRes, aRes] = await Promise.allSettled([
                frotaApi.veiculos(), frotaApi.solicitacoesAbastecimento(qsSol),
                frotaApi.abastecimentos(qsAbast),
            ]);
            if (reqIdRef.current !== reqId) return;
            if (vRes.status === 'fulfilled') setVeiculos(Array.isArray(vRes.value) ? vRes.value : []);
            if (sRes.status === 'fulfilled') setSolicitacoes(Array.isArray(sRes.value) ? sRes.value : []);
            if (aRes.status === 'fulfilled') setAbastecimentos(Array.isArray(aRes.value) ? aRes.value : []);
            if ([vRes, sRes, aRes].some(r => r.status === 'rejected')) {
                notify.error('Erro ao carregar abastecimentos.');
            }
        } catch (e) {
            logger.error('Frota abastecimentos', e);
            notify.error('Erro ao carregar abastecimentos.');
        } finally {
            if (reqIdRef.current === reqId) setLoading(false);
        }
    }, [filtroVeiculo, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);

    const pendentes = solicitacoes.filter(s => s.status === 'pendente');
    const totalPeriodo = abastecimentos.reduce((s, a) => s + (Number(a.valor) || 0), 0);
    const litrosPeriodo = abastecimentos.reduce((s, a) => s + (Number(a.litros) || 0), 0);

    const copiar = (url) => {
        navigator.clipboard.writeText(url)
            .then(() => notify.success('Link copiado.'))
            .catch(() => notify.error('Não foi possível copiar o link.'));
    };

    const linkDe = (s) => `${window.location.origin}/abastecimento/${s.token}`;

    const whatsapp = (s) => {
        const texto = `Abastecimento autorizado — ${placaBR(s.veiculo_placa)} ${s.veiculo_modelo || ''}\n`
            + (s.limite_valor ? `Limite: ${brl(s.limite_valor)}\n` : '')
            + `Abra o link, informe o KM e os litros e anexe a foto do cupom:\n${linkDe(s)}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    };

    const cancelar = async (s) => {
        const ok = await confirmDialog(
            `Cancelar o link do abastecimento de ${placaBR(s.veiculo_placa)}? `
            + 'O motorista não conseguirá mais enviar por ele.',
            { danger: true, confirmText: 'Cancelar link' },
        );
        if (!ok) return;
        try {
            await frotaApi.cancelarSolicitacaoAbastecimento(s.id);
            notify.success('Link cancelado.');
            carregar();
        } catch (e) {
            logger.error('cancelar link de abastecimento', e);
            notify.error(e.message || 'Erro ao cancelar o link.');
        }
    };

    const remover = async (id) => {
        const ok = await confirmDialog('Remover este abastecimento?', { danger: true });
        if (!ok) return;
        try {
            await frotaApi.removerAbastecimento(id);
            notify.success('Abastecimento removido.');
            carregar();
        } catch (e) {
            logger.error('remover abastecimento', e);
            notify.error(e.message || 'Erro ao remover.');
        }
    };

    const removerAutorizacao = async (s) => {
        const ok = await confirmDialog(
            `Excluir a autorização de ${placaBR(s.veiculo_placa)}? `
            + 'O link deixará de existir e essa ação não pode ser desfeita.',
            { danger: true, confirmText: 'Excluir autorização' },
        );
        if (!ok) return;
        try {
            await frotaApi.removerSolicitacaoAbastecimento(s.id);
            notify.success('Autorização excluída.');
            carregar();
        } catch (e) {
            logger.error('remover autorização de abastecimento', e);
            notify.error(e.message || 'Erro ao excluir a autorização.');
        }
    };

    const abrirComprovante = async (id) => {
        try {
            const { url } = await frotaApi.arquivoUrl('abastecimento', id);
            window.open(url, '_blank', 'noopener');
        } catch (e) {
            notify.error(e.message || 'Erro ao abrir o comprovante.');
        }
    };

    return (
        <>
            <div className="frota-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className={`frota-kpi${pendentes.length ? ' alert' : ' accent'}`}>
                    <div className="frota-kpi-lbl"><i className="ti ti-clock" /> Aguardando motorista</div>
                    <div className="frota-kpi-val">{pendentes.length}</div>
                </div>
                <div className="frota-kpi">
                    <div className="frota-kpi-lbl"><i className="ti ti-gas-station" /> Abastecimentos (período)</div>
                    <div className="frota-kpi-val">{abastecimentos.length}</div>
                </div>
                <div className="frota-kpi">
                    <div className="frota-kpi-lbl"><i className="ti ti-droplet" /> Litros (período)</div>
                    <div className="frota-kpi-val">{num(litrosPeriodo, 0)} L</div>
                </div>
                <div className="frota-kpi">
                    <div className="frota-kpi-lbl"><i className="ti ti-cash" /> Gasto (período)</div>
                    <div className="frota-kpi-val">{brlShort(totalPeriodo)}</div>
                </div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-filter" /> Filtros</div>
                    <div className="frota-card-actions">
                        <select className="frota-inp" style={{ maxWidth: 190 }} value={filtroVeiculo}
                            onChange={e => setFiltroVeiculo(e.target.value)}>
                            <option value="">Todos os veículos</option>
                            {veiculos.map(v => (
                                <option key={v.id} value={v.id}>{placaBR(v.placa)} — {v.modelo}</option>
                            ))}
                        </select>
                        <input className="frota-inp" type="date" style={{ maxWidth: 150 }}
                            value={de} onChange={e => setDe(e.target.value)} title="De" />
                        <input className="frota-inp" type="date" style={{ maxWidth: 150 }}
                            value={ate} onChange={e => setAte(e.target.value)} title="Até" />
                    </div>
                </div>
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title">
                        <i className="ti ti-link" /> Autorizações enviadas ao motorista
                    </div>
                    <div className="frota-card-actions">
                        <button className="frota-btn frota-btn-secondary frota-btn-sm"
                            onClick={() => setModalManual(true)}>
                            <i className="ti ti-plus" /> Lançar manualmente
                        </button>
                        <button className="frota-btn frota-btn-primary frota-btn-sm"
                            onClick={() => setModalLink(true)}>
                            <i className="ti ti-send" /> Autorizar abastecimento
                        </button>
                    </div>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead>
                            <tr>
                                <th>Veículo</th><th>Motorista</th><th>Enviado</th>
                                <th>Limite</th><th>Preenchido</th><th>Status</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {solicitacoes.length === 0 && (
                                <tr><td colSpan={7} className="frota-empty">
                                    Nenhuma autorização. Use "Autorizar abastecimento" para gerar o
                                    link que o motorista abre no celular.
                                </td></tr>
                            )}
                            {solicitacoes.map(s => {
                                const b = statusBadge(s.status);
                                return (
                                    <tr key={s.id}>
                                        <td>
                                            <div className="frota-cell-main">{placaBR(s.veiculo_placa)}</div>
                                            <div className="frota-cell-sub">{s.veiculo_modelo}</div>
                                        </td>
                                        <td className="frota-muted">{s.condutor_nome || '—'}</td>
                                        <td className="frota-muted">{dataBR(s.criado_em)}</td>
                                        <td className="frota-muted">
                                            {s.limite_valor != null ? brl(s.limite_valor) : '—'}
                                        </td>
                                        <td className="frota-muted">
                                            {s.status === 'concluida' ? (
                                                <>
                                                    <div className="frota-cell-main">{brl(s.valor_total)}</div>
                                                    <div className="frota-cell-sub">
                                                        {num(s.litros)} L · {inteiro(s.km)} km
                                                    </div>
                                                </>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            <span className={`frota-badge ${b.cls}`}>
                                                <i className={`ti ${b.icon}`} /> {b.label}
                                            </span>
                                        </td>
                                        <td>
                                            {s.status === 'pendente' && (
                                                <>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Copiar link" onClick={() => copiar(linkDe(s))}>
                                                        <i className="ti ti-copy" />
                                                    </button>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Enviar no WhatsApp" onClick={() => whatsapp(s)}>
                                                        <i className="ti ti-brand-whatsapp" />
                                                    </button>
                                                    <button className="frota-btn frota-btn-text frota-btn-sm"
                                                        title="Cancelar link" onClick={() => cancelar(s)}>
                                                        <i className="ti ti-ban" />
                                                    </button>
                                                </>
                                            )}
                                            {ehMaster && s.status !== 'concluida' && (
                                                <button className="frota-btn frota-btn-text frota-btn-sm"
                                                    title="Excluir autorização"
                                                    onClick={() => removerAutorizacao(s)}>
                                                    <i className="ti ti-trash" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="frota-card">
                <div className="frota-card-head">
                    <div className="frota-card-title"><i className="ti ti-gas-station" /> Abastecimentos</div>
                </div>
                {loading ? <div className="frota-loading">Carregando…</div> : (
                    <table className="frota-table">
                        <thead>
                            <tr>
                                <th>Data</th><th>Veículo</th><th>Litros</th><th>R$/L</th>
                                <th>KM</th><th>Posto</th><th>Valor</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {abastecimentos.length === 0 && (
                                <tr><td colSpan={8} className="frota-empty">
                                    Nenhum abastecimento no período.
                                </td></tr>
                            )}
                            {abastecimentos.map(a => (
                                <tr key={a.id}>
                                    <td className="frota-muted">
                                        {dataBR(a.data)}
                                        {a.origem === 'superlink' && (
                                            <div className="frota-cell-sub">
                                                <i className="ti ti-link" /> pelo motorista
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="frota-cell-main">{placaBR(a.veiculo_placa)}</div>
                                        <div className="frota-cell-sub">{a.veiculo_modelo}</div>
                                    </td>
                                    <td className="frota-muted">{a.litros != null ? `${num(a.litros)} L` : '—'}</td>
                                    <td className="frota-muted">{a.preco_litro != null ? brl(a.preco_litro) : '—'}</td>
                                    <td className="frota-muted">{inteiro(a.km)}</td>
                                    <td className="frota-muted">{a.posto || '—'}</td>
                                    <td className="frota-valor">{brl(a.valor)}</td>
                                    <td>
                                        {a.tem_comprovante && (
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Ver comprovante"
                                                onClick={() => abrirComprovante(a.id)}>
                                                <i className="ti ti-paperclip" />
                                            </button>
                                        )}
                                        <button className="frota-btn frota-btn-text frota-btn-sm"
                                            title="Consumo do veículo"
                                            onClick={() => setConsumoVeiculo(
                                                veiculos.find(v => v.id === a.veiculo_id)
                                                || { id: a.veiculo_id, placa: a.veiculo_placa, modelo: a.veiculo_modelo }
                                            )}>
                                            <i className="ti ti-chart-line" />
                                        </button>
                                        {ehMaster && (
                                            <button className="frota-btn frota-btn-text frota-btn-sm"
                                                title="Remover" onClick={() => remover(a.id)}>
                                                <i className="ti ti-trash" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="frota-hint">
                    <i className="ti ti-info-circle" /> O comprovante enviado pelo motorista é lido
                    automaticamente para preencher preço e valor total — ele confere antes de enviar.
                </div>
            </div>

            <SolicitarAbastecimentoModal
                isOpen={modalLink} veiculos={veiculos} condutores={condutores}
                onClose={() => { setModalLink(false); carregar(); }}
                onSaved={carregar}
            />
            <AbastecimentoModal
                isOpen={modalManual} veiculos={veiculos} condutores={condutores}
                onClose={() => setModalManual(false)}
                onSaved={() => { setModalManual(false); carregar(); }}
            />
            <ConsumoVeiculoModal
                isOpen={!!consumoVeiculo} veiculo={consumoVeiculo}
                onClose={() => { setConsumoVeiculo(null); carregar(); }}
            />
        </>
    );
}
