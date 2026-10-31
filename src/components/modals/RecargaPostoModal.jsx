import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { frotaApi } from '../../screens/Frota/frotaApi';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { brl } from '../../screens/Frota/frotaFormat';

const vazio = {
    posto_id: '', posto_modo: 'selecionar', novo_posto_nome: '',
    data: '', valor: '', observacao: '',
};

// Mesma regra do limpar_valor do backend: o preview não pode divergir do que
// a API grava. '1.250' digitado é mil duzentos e cinquenta, não um e vinte e cinco.
function numeroBR(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    let texto = String(valor).replace('R$', '').trim();
    // Vírgula presente: o ponto só pode ser separador de milhar ('1.250,50').
    if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
    // Sem vírgula, grupos de 3 dígitos são milhar BR ('1.250' -> 1250).
    else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) texto = texto.replace(/\./g, '');
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
}

export default function RecargaPostoModal({ isOpen, postoFixo, saldos, onClose, onSaved }) {
    const [form, setForm] = useState(vazio);
    const [postos, setPostos] = useState([]);
    const [carregandoPostos, setCarregandoPostos] = useState(false);
    const [falhouLista, setFalhouLista] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const valor = numeroBR(form.valor);
    const saldoAtual = (saldos || []).find(
        s => String(s.posto_id) === String(form.posto_id),
    );
    const saldoDepois = saldoAtual && valor > 0 ? saldoAtual.saldo + valor : null;

    useEffect(() => {
        if (!isOpen) return;
        setForm({
            ...vazio,
            posto_id: postoFixo?.posto_id ?? postoFixo?.id ?? '',
            data: new Date().toISOString().slice(0, 10),
        });
    }, [isOpen, postoFixo]);

    useEffect(() => {
        if (!isOpen) return undefined;
        let ativo = true;
        setCarregandoPostos(true);
        setFalhouLista(false);
        frotaApi.postosCombustivel()
            .then((lista) => { if (ativo) setPostos(Array.isArray(lista) ? lista : []); })
            .catch((e) => {
                logger.error('listar postos de combustível', e);
                if (!ativo) return;
                setPostos([]);
                // Sem o aviso a lista aparecia vazia e empurrava o gestor a
                // cadastrar de novo um posto que já existe.
                setFalhouLista(true);
                notify.error('Não foi possível carregar os postos. Tente de novo antes de cadastrar um novo.');
            })
            .finally(() => { if (ativo) setCarregandoPostos(false); });
        return () => { ativo = false; };
    }, [isOpen]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const salvar = async () => {
        const criandoPosto = form.posto_modo === 'novo';
        if (!criandoPosto && !form.posto_id) { notify.warning('Selecione o posto.'); return; }
        if (criandoPosto && !form.novo_posto_nome.trim()) {
            notify.warning('Informe o nome do novo posto.'); return;
        }
        if (!form.data) { notify.warning('Informe a data da recarga.'); return; }
        if (!(valor > 0)) { notify.warning('Informe um valor maior que zero.'); return; }
        setSalvando(true);
        try {
            // Posto novo é cadastrado primeiro: a recarga precisa de um id.
            let postoId = form.posto_id;
            let postoCriado = null;
            if (criandoPosto) {
                const posto = await frotaApi.criarPostoCombustivel(form.novo_posto_nome.trim());
                postoId = posto.id;
                postoCriado = posto.nome;
            }
            try {
                await frotaApi.criarRecargaPosto(postoId, {
                    data: form.data,
                    valor: form.valor,
                    observacao: form.observacao.trim() || null,
                });
            } catch (e) {
                // São duas chamadas: o posto pode ter sido cadastrado e a
                // recarga falhar. Dizer isso evita o gestor cadastrar de novo
                // achando que nada aconteceu.
                if (postoCriado) {
                    e.message = `O posto "${postoCriado}" foi cadastrado, mas a recarga `
                        + `não foi lançada: ${e.message || 'erro na API'}. `
                        + 'Selecione o posto na lista e lance a recarga de novo.';
                }
                throw e;
            }
            notify.success('Recarga lançada.');
            onSaved?.();
        } catch (e) {
            logger.error('lançar recarga de posto', e);
            notify.error(e.message || 'Erro ao lançar a recarga.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<>
                <i className="ti ti-wallet" style={{ marginRight: 8 }} />
                Nova recarga de saldo
            </>}
            footer={<>
                <button className="frota-btn frota-btn-text" onClick={onClose}>Cancelar</button>
                <button className="frota-btn frota-btn-primary" onClick={salvar} disabled={salvando}>
                    <i className="ti ti-check" /> {salvando ? 'Salvando…' : 'Lançar recarga'}
                </button>
            </>}
        >
            <div className="frota-field"><label htmlFor="recarga-posto">Posto</label>
                <select
                    id="recarga-posto"
                    className="frota-inp"
                    value={form.posto_modo === 'novo' ? '__novo__' : form.posto_id}
                    disabled={carregandoPostos || !!postoFixo}
                    onChange={(e) => {
                        if (e.target.value === '__novo__') {
                            setForm(f => ({ ...f, posto_modo: 'novo', posto_id: '' }));
                        } else {
                            setForm(f => ({
                                ...f, posto_modo: 'selecionar',
                                posto_id: e.target.value, novo_posto_nome: '',
                            }));
                        }
                    }}
                >
                    <option value="">
                        {carregandoPostos ? 'Carregando…'
                            : (falhouLista ? 'Erro ao carregar os postos' : 'Selecione…')}
                    </option>
                    {postos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    {!postoFixo && <option value="__novo__">+ Cadastrar novo posto</option>}
                </select>
                {form.posto_modo === 'novo' && (
                    <>
                        <input
                            className="frota-inp"
                            aria-label="Nome do novo posto"
                            maxLength={160}
                            placeholder="Nome do novo posto"
                            value={form.novo_posto_nome}
                            onChange={e => set('novo_posto_nome', e.target.value)}
                        />
                        <small className="frota-field-help">Será cadastrado ao salvar.</small>
                    </>
                )}
            </div>
            <div className="frota-row2">
                <div className="frota-field"><label htmlFor="recarga-valor">Valor da recarga</label>
                    <input id="recarga-valor" className="frota-inp money" placeholder="0,00"
                        value={form.valor} onChange={e => set('valor', e.target.value)} /></div>
                <div className="frota-field"><label htmlFor="recarga-data">Data</label>
                    <input id="recarga-data" className="frota-inp" type="date"
                        value={form.data} onChange={e => set('data', e.target.value)} /></div>
            </div>
            {saldoAtual && (
                <div className="frota-callout frota-callout-info">
                    <i className="ti ti-info-circle" />
                    <span>
                        Saldo atual de {saldoAtual.posto_nome}: <strong>{brl(saldoAtual.saldo)}</strong>
                        {saldoDepois != null && <> → <strong>{brl(saldoDepois)}</strong> após a recarga</>}
                    </span>
                </div>
            )}
            <div className="frota-field"><label htmlFor="recarga-obs">Observação (opcional)</label>
                <input id="recarga-obs" className="frota-inp" maxLength={300}
                    placeholder="Depósito, PIX, nota do posto…"
                    value={form.observacao} onChange={e => set('observacao', e.target.value)} /></div>
            <div className="frota-hint">
                <i className="ti ti-info-circle" /> O saldo é sempre as recargas menos os
                abastecimentos lançados neste posto. Para começar, lance o saldo que já
                existe hoje na conta dele.
            </div>
        </Modal>
    );
}
