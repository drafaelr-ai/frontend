import React, { useEffect, useState } from 'react';
import { confirmDialog, notify } from '../../utils/notify';
import { logger } from '../../utils/logger';
import { rhApi } from './rhApi';
import './ponto.css';

const WEEK_DAYS = [
    ['0', 'Seg'], ['1', 'Ter'], ['2', 'Qua'], ['3', 'Qui'], ['4', 'Sex'], ['5', 'Sáb'], ['6', 'Dom'],
];

const MARK_TYPES = [
    ['entrada', 'Entrada'], ['saida', 'Saída'], ['intervalo_inicio', 'Início do intervalo'], ['intervalo_fim', 'Fim do intervalo'],
];

function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function currentDateTime() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function monthEnd(competencia) {
    const [year, month] = competencia.split('-').map(Number);
    return new Date(year, month, 0).toISOString().slice(0, 10);
}

function formatMinutes(value) {
    const minutes = Number(value || 0);
    const signal = minutes < 0 ? '−' : '';
    const absolute = Math.abs(minutes);
    return `${signal}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function displayDate(value) {
    if (!value) return '—';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
}

function statusLabel(status) {
    const map = {
        ok: 'Regular', hora_extra: 'Hora extra', pendencia: 'Déficit', incompleto: 'Incompleto',
        sem_marcacao: 'Sem batida', folga: 'Folga',
    };
    return map[status] || status;
}

function emptyMark() {
    return { data_hora: currentDateTime(), tipo: 'entrada', observacao: '' };
}

export default function PontoRH({ funcionarios = [] }) {
    const [funcionarioId, setFuncionarioId] = useState('');
    const [competencia, setCompetencia] = useState(currentMonth);
    const [folha, setFolha] = useState(null);
    const [marcacoes, setMarcacoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [markForm, setMarkForm] = useState(emptyMark);
    const [jornada, setJornada] = useState(null);

    useEffect(() => {
        if (!funcionarioId && funcionarios.length) setFuncionarioId(String(funcionarios[0].id));
    }, [funcionarios, funcionarioId]);

    const load = async () => {
        if (!funcionarioId) return;
        setLoading(true);
        try {
            const params = `?data_inicio=${competencia}-01&data_fim=${monthEnd(competencia)}`;
            const [folhaData, marks] = await Promise.all([
                rhApi.folhaPonto(competencia, funcionarioId), rhApi.marcacoesPonto(funcionarioId, params),
            ]);
            setFolha(folhaData);
            setJornada(folhaData.jornada);
            setMarcacoes(Array.isArray(marks) ? marks : []);
        } catch (error) {
            logger.error('Carregar ponto', error);
            notify.error(error.message || 'Não foi possível carregar a folha de ponto.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [funcionarioId, competencia]); // eslint-disable-line react-hooks/exhaustive-deps

    const submitMark = async (event) => {
        event.preventDefault();
        if (!funcionarioId) return;
        setSaving(true);
        try {
            await rhApi.criarMarcacaoPonto({ ...markForm, funcionario_id: funcionarioId, origem: 'manual' });
            notify.success('Batida manual registrada.');
            setMarkForm(emptyMark());
            await load();
        } catch (error) {
            logger.error('Criar batida', error);
            notify.error(error.message || 'Não foi possível registrar a batida.');
        } finally {
            setSaving(false);
        }
    };

    const removeMark = async (marcacao) => {
        if (!await confirmDialog(`Remover a batida de ${marcacao.funcionario_nome} em ${displayDate(marcacao.data_hora)}?`, { danger: true, confirmText: 'Remover' })) return;
        try {
            await rhApi.removerMarcacaoPonto(marcacao.id);
            notify.success('Batida removida.');
            await load();
        } catch (error) {
            logger.error('Remover batida', error);
            notify.error(error.message || 'Não foi possível remover a batida.');
        }
    };

    const toggleDay = (day) => {
        const current = new Set((jornada?.dias_trabalho || []).map(String));
        if (current.has(day)) current.delete(day); else current.add(day);
        setJornada({ ...jornada, dias_trabalho: Array.from(current).map(Number).sort() });
    };

    const saveJornada = async () => {
        if (!funcionarioId || !jornada) return;
        setSaving(true);
        try {
            const updated = await rhApi.salvarJornadaPonto(funcionarioId, jornada);
            setJornada(updated);
            notify.success('Jornada atualizada.');
            await load();
        } catch (error) {
            logger.error('Salvar jornada', error);
            notify.error(error.message || 'Não foi possível salvar a jornada.');
        } finally {
            setSaving(false);
        }
    };

    const exportCsv = () => {
        if (!folha) return;
        const header = ['Data', 'Dia', 'Entrada', 'Saída', 'Trabalhado', 'Previsto', 'Saldo', 'Atraso', 'Situação'];
        const rows = folha.dias.map(day => [
            displayDate(day.data), day.dia_semana, day.entrada || '', day.saida || '',
            formatMinutes(day.trabalhado_minutos), formatMinutes(day.esperado_minutos),
            formatMinutes(day.saldo_minutos), formatMinutes(day.atraso_minutos), statusLabel(day.status),
        ]);
        const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
        const file = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(file);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `folha_ponto_${folha.funcionario.nome.replaceAll(' ', '_')}_${folha.competencia}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <section className="ponto-panel">
            <div className="ponto-toolbar rh-card">
                <label className="ponto-field"><span>Colaborador</span><select value={funcionarioId} onChange={event => setFuncionarioId(event.target.value)}><option value="">Selecione</option>{funcionarios.map(funcionario => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}{funcionario.obra_nome ? ` · ${funcionario.obra_nome}` : ''}</option>)}</select></label>
                <label className="ponto-field"><span>Competência</span><input type="month" value={competencia} onChange={event => setCompetencia(event.target.value)} /></label>
                <button className="rh-btn rh-btn-secondary ponto-refresh" onClick={load} disabled={loading || !funcionarioId}><i className="ti ti-refresh" /> Atualizar</button>
                <button className="rh-btn rh-btn-primary ponto-export" onClick={exportCsv} disabled={!folha}><i className="ti ti-download" /> Exportar folha</button>
            </div>

            {!funcionarios.length ? <div className="rh-card ponto-empty"><i className="ti ti-users-minus" /> Cadastre um funcionário ativo antes de registrar o ponto.</div> : loading ? <div className="rh-loading">Apurando ponto...</div> : folha && <>
                <div className="ponto-kpis">
                    <article className="ponto-kpi"><span>Trabalhado</span><strong>{formatMinutes(folha.resumo.trabalhado_minutos)}</strong></article>
                    <article className="ponto-kpi"><span>Previsto</span><strong>{formatMinutes(folha.resumo.esperado_minutos)}</strong></article>
                    <article className={`ponto-kpi ${folha.resumo.saldo_minutos < 0 ? 'negative' : 'positive'}`}><span>Saldo</span><strong>{formatMinutes(folha.resumo.saldo_minutos)}</strong></article>
                    <article className="ponto-kpi alert"><span>Pendências</span><strong>{folha.resumo.dias_com_pendencia}</strong></article>
                </div>

                <div className="ponto-columns">
                    <form className="rh-card ponto-form-card" onSubmit={submitMark}>
                        <div className="rh-card-head"><div className="rh-card-title"><i className="ti ti-clock-plus" /> Registrar batida</div></div>
                        <p className="ponto-hint">Use para correções manuais. Batidas recebidas do relógio permanecem protegidas no histórico.</p>
                        <label className="ponto-field"><span>Data e hora *</span><input type="datetime-local" value={markForm.data_hora} onChange={event => setMarkForm({ ...markForm, data_hora: event.target.value })} required /></label>
                        <label className="ponto-field"><span>Tipo *</span><select value={markForm.tipo} onChange={event => setMarkForm({ ...markForm, tipo: event.target.value })}>{MARK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="ponto-field"><span>Observação</span><textarea rows="3" value={markForm.observacao} onChange={event => setMarkForm({ ...markForm, observacao: event.target.value })} placeholder="Motivo da inclusão manual" /></label>
                        <button className="rh-btn rh-btn-primary ponto-full-btn" disabled={saving}><i className="ti ti-check" /> {saving ? 'Salvando...' : 'Registrar batida'}</button>
                    </form>

                    <section className="rh-card ponto-jornada-card">
                        <div className="rh-card-head"><div className="rh-card-title"><i className="ti ti-calendar-time" /> Jornada de trabalho</div></div>
                        <div className="ponto-jornada-grid">
                            <label className="ponto-field"><span>Carga diária (horas)</span><input type="number" min="0.5" max="24" step="0.5" value={jornada?.carga_horaria_diaria ?? ''} onChange={event => setJornada({ ...jornada, carga_horaria_diaria: event.target.value })} /></label>
                            <label className="ponto-field"><span>Entrada prevista</span><input type="time" value={jornada?.horario_entrada ?? ''} onChange={event => setJornada({ ...jornada, horario_entrada: event.target.value })} /></label>
                            <label className="ponto-field"><span>Intervalo (minutos)</span><input type="number" min="0" max="600" value={jornada?.intervalo_minutos ?? ''} onChange={event => setJornada({ ...jornada, intervalo_minutos: event.target.value })} /></label>
                        </div>
                        <span className="ponto-days-label">Dias de trabalho</span>
                        <div className="ponto-week-days">{WEEK_DAYS.map(([day, label]) => <label key={day} className={`ponto-day${jornada?.dias_trabalho?.map(String).includes(day) ? ' selected' : ''}`}><input type="checkbox" checked={jornada?.dias_trabalho?.map(String).includes(day) || false} onChange={() => toggleDay(day)} />{label}</label>)}</div>
                        <button className="rh-btn rh-btn-secondary ponto-full-btn" onClick={saveJornada} disabled={saving}><i className="ti ti-device-floppy" /> Salvar jornada</button>
                    </section>
                </div>

                <section className="rh-card ponto-folha-card">
                    <div className="rh-card-head"><div className="rh-card-title"><i className="ti ti-file-description" /> Folha de ponto · {folha.funcionario.nome}</div><span className="ponto-competencia">{folha.competencia}</span></div>
                    <div className="ponto-table-wrap"><table className="rh-table ponto-table"><thead><tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Trabalhado</th><th>Previsto</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{folha.dias.map(day => <tr key={day.data} className={day.status === 'folga' ? 'ponto-day-off' : ''}><td><span className="ponto-date">{displayDate(day.data)}</span><small>{day.dia_semana}</small></td><td>{day.entrada || '—'}</td><td>{day.saida || '—'}</td><td>{formatMinutes(day.trabalhado_minutos)}</td><td>{formatMinutes(day.esperado_minutos)}</td><td className={day.saldo_minutos < 0 ? 'ponto-negative' : day.saldo_minutos > 0 ? 'ponto-positive' : ''}>{formatMinutes(day.saldo_minutos)}</td><td><span className={`ponto-status ${day.status}`}>{statusLabel(day.status)}</span></td></tr>)}</tbody></table></div>
                </section>

                <section className="rh-card ponto-history-card">
                    <div className="rh-card-head"><div className="rh-card-title"><i className="ti ti-list-details" /> Batidas registradas</div><span className="ponto-competencia">{marcacoes.length} registros</span></div>
                    <div className="ponto-table-wrap"><table className="rh-table ponto-table"><thead><tr><th>Data e hora</th><th>Tipo</th><th>Origem</th><th>Observação</th><th aria-label="Ações" /></tr></thead><tbody>{marcacoes.length ? marcacoes.map(mark => <tr key={mark.id}><td>{displayDate(mark.data_hora)} · {String(mark.data_hora).slice(11, 16)}</td><td>{MARK_TYPES.find(type => type[0] === mark.tipo)?.[1] || mark.tipo}</td><td><span className={`ponto-origin ${mark.origem}`}>{mark.origem === 'manual' ? 'Manual' : 'Relógio'}</span></td><td>{mark.observacao || '—'}</td><td>{mark.origem === 'manual' && <button className="ponto-remove" onClick={() => removeMark(mark)} title="Remover batida manual"><i className="ti ti-trash" /></button>}</td></tr>) : <tr><td colSpan="5" className="rh-empty">Nenhuma batida na competência selecionada.</td></tr>}</tbody></table></div>
                </section>
            </>}
        </section>
    );
}
