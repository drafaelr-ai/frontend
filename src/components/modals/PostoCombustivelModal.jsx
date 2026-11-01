import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const UNIDADES = [
    { value: 'reais', label: 'Reais (R$) — crédito em dinheiro' },
    { value: 'litros', label: 'Litros — litros pré-comprados' },
];

export default function PostoCombustivelModal({ isOpen, posto, onClose, onSaved }) {
    const [nome, setNome] = useState('');
    const [unidade, setUnidade] = useState('reais');
    const [ativo, setAtivo] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const editando = Boolean(posto?.posto_id ?? posto?.id);
    // Trocar a unidade reinterpreta os movimentos já lançados, então a API só
    // aceita enquanto o posto não tem recarga. Espelhar a regra aqui evita o
    // gestor descobrir isso num erro depois de preencher o formulário.
    const temMovimento = (posto?.recargas ?? 0) > 0;

    useEffect(() => {
        if (!isOpen) return;
        setNome(posto?.posto_nome ?? posto?.nome ?? '');
        setUnidade(posto?.unidade || 'reais');
        setAtivo(posto?.ativo !== false);
    }, [isOpen, posto]);

    const salvar = async () => {
        const limpo = nome.trim();
        if (limpo.length < 2) { notify.warning('Informe o nome do posto.'); return; }
        setSalvando(true);
        try {
            if (editando) {
                const corpo = { nome: limpo, ativo };
                if (!temMovimento) corpo.unidade = unidade;
                await frotaApi.editarPostoCombustivel(posto.posto_id ?? posto.id, corpo);
                notify.success('Posto atualizado.');
            } else {
                await frotaApi.criarPostoCombustivel(limpo, unidade);
                notify.success('Posto cadastrado.');
            }
            onSaved?.();
        } catch (e) {
            logger.error('salvar posto de combustível', e);
            notify.error(e.message || 'Erro ao salvar o posto.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<>
                <i className={`ti ${editando ? 'ti-edit' : 'ti-building-store'}`}
                    style={{ marginRight: 8 }} />
                {editando ? 'Editar posto' : 'Novo posto'}
            </>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Salvar'}
                </button>
            </>}
        >
            <div className="frota-field"><label htmlFor="posto-nome">Nome do posto</label>
                <input id="posto-nome" className="frota-inp" maxLength={160}
                    placeholder="Posto Ipiranga Centro"
                    value={nome} onChange={e => setNome(e.target.value)} /></div>

            <div className="frota-field">
                <label htmlFor="posto-unidade">Saldo controlado em</label>
                <select id="posto-unidade" className="frota-inp" value={unidade}
                    disabled={editando && temMovimento}
                    onChange={e => setUnidade(e.target.value)}>
                    {UNIDADES.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
                {editando && temMovimento ? (
                    <small className="frota-field-help">
                        Não pode mudar: este posto já tem movimento lançado. Para outra
                        unidade, cadastre um posto novo.
                    </small>
                ) : (
                    <small className="frota-field-help">
                        Em reais o abastecimento desconta pelo valor da nota; em litros,
                        pelos litros informados.
                    </small>
                )}
            </div>

            {editando && (
                <div className="frota-field">
                    <label className="frota-check-item" htmlFor="posto-ativo">
                        <input id="posto-ativo" type="checkbox" checked={ativo}
                            onChange={e => setAtivo(e.target.checked)} />
                        <span>Posto ativo</span>
                    </label>
                    <small className="frota-field-help">
                        Posto inativo sai da lista de saldos e da seleção de abastecimento,
                        sem apagar o histórico.
                    </small>
                </div>
            )}
        </Modal>
    );
}
