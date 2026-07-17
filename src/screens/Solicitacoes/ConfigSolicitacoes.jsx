import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { solicitacoesApi } from './solicitacoesApi';

export default function ConfigSolicitacoes({ user }) {
    const [usuarios, setUsuarios] = useState(null);   // null = carregando
    const [alertados, setAlertados] = useState(new Set());
    const [aprovadores, setAprovadores] = useState(new Set());
    const [limite, setLimite] = useState('');
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [users, cfg] = await Promise.all([
                    solicitacoesApi.usuarios(), solicitacoesApi.getConfig(),
                ]);
                // /admin/users exclui o usuário logado — inclui o próprio master
                // na lista pra ele poder se marcar como alertado/aprovador.
                const lista = Array.isArray(users) ? [...users] : [];
                if (user && !lista.some(u => u.id === user.id)) {
                    lista.unshift({ id: user.id, username: user.username, role: user.role });
                }
                setUsuarios(lista);
                setAlertados(new Set(cfg.alertados_ids || []));
                setAprovadores(new Set(cfg.aprovadores_ids || []));
                setLimite(cfg.limite_valor != null ? String(cfg.limite_valor).replace('.', ',') : '');
            } catch (e) {
                logger.error('config solicitações', e);
                setUsuarios([]);
                notify.error(e.message || 'Erro ao carregar configuração.');
            }
        })();
    }, [user]);

    const toggle = (setter) => (id) => setter(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const toggleAlertado = toggle(setAlertados);
    const toggleAprovador = toggle(setAprovadores);

    const salvar = async () => {
        setSalvando(true);
        try {
            await solicitacoesApi.putConfig({
                alertados_ids: [...alertados],
                aprovadores_ids: [...aprovadores],
                limite_valor: limite.trim() === '' ? null : limite,
            });
            notify.success('Configuração salva.');
        } catch (e) {
            notify.error(e.message || 'Erro ao salvar configuração.');
        } finally { setSalvando(false); }
    };

    if (usuarios == null) return <div className="solc-loading">Carregando…</div>;

    const listaUsuarios = (marcados, onToggle) => (
        <div className="solc-userlist">
            {usuarios.map(u => (
                <label key={u.id} className="solc-usercheck">
                    <input type="checkbox" checked={marcados.has(u.id)} onChange={() => onToggle(u.id)} />
                    {u.username} <span className="role">({u.role})</span>
                </label>
            ))}
        </div>
    );

    return (
        <>
            <div className="solc-row2">
                <div className="solc-card">
                    <div className="solc-card-title" style={{ marginBottom: 'var(--space-2)' }}>
                        <i className="ti ti-bell" /> Alertados nas novas solicitações
                    </div>
                    <div className="solc-hint" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                        Quem recebe o alerta no sino quando uma solicitação é criada (equipe da pesquisa de preços).
                    </div>
                    {listaUsuarios(alertados, toggleAlertado)}
                </div>

                <div className="solc-card">
                    <div className="solc-card-title" style={{ marginBottom: 'var(--space-2)' }}>
                        <i className="ti ti-shield-check" /> Aprovadores de compra
                    </div>
                    <div className="solc-hint" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                        Quem pode aprovar ou rejeitar compras. O master sempre pode aprovar.
                    </div>
                    {listaUsuarios(aprovadores, toggleAprovador)}
                </div>
            </div>

            <div className="solc-card">
                <div className="solc-card-title" style={{ marginBottom: 'var(--space-2)' }}>
                    <i className="ti ti-cash" /> Limite para compra direta
                </div>
                <div className="solc-hint" style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    Compras com cotação escolhida até este valor podem ser efetivadas sem aprovador.
                    Deixe vazio para exigir aprovação em toda compra.
                </div>
                <div className="solc-field" style={{ maxWidth: 240 }}>
                    <label>Valor limite (R$)</label>
                    <input
                        className="solc-inp money" placeholder="Ex.: 1.000,00"
                        value={limite} onChange={e => setLimite(e.target.value)}
                    />
                </div>
                <div className="solc-card-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="solc-btn solc-btn-primary" onClick={salvar} disabled={salvando}>
                        <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar configuração'}
                    </button>
                </div>
            </div>
        </>
    );
}
