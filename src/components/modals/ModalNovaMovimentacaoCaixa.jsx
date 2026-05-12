import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { compressImages } from '../../utils/imageCompression';

const ModalNovaMovimentacaoCaixa = ({ obraId, onClose, onSave }) => {
    const [tipo, setTipo] = useState('Saída');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [comprovante, setComprovante] = useState(null);
    const [previewComprovante, setPreviewComprovante] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    const handleComprovanteChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setComprovante(reader.result);
                setPreviewComprovante(null);
            };
            reader.readAsDataURL(file);
            return;
        }

        if (file.type.startsWith('image/')) {
            try {
                setIsCompressing(true);
                logger.debug('Comprimindo imagem do comprovante...');

                const compressedImages = await compressImages([file]);

                if (compressedImages && compressedImages.length > 0) {
                    const compressed = compressedImages[0];
                    setComprovante(compressed.base64);
                    setPreviewComprovante(compressed.base64);
                    logger.debug('Imagem comprimida com sucesso');
                }
            } catch (err) {
                logger.error('Erro ao comprimir imagem:', err);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setComprovante(reader.result);
                    setPreviewComprovante(reader.result);
                };
                reader.readAsDataURL(file);
            } finally {
                setIsCompressing(false);
            }
        }
    };

    const handleSubmit = async () => {
        if (!valor || parseFloat(valor) <= 0) {
            notify.warning('Por favor, informe um valor válido');
            return;
        }

        if (!descricao.trim()) {
            notify.warning('Por favor, informe uma descrição');
            return;
        }

        try {
            setIsSubmitting(true);

            let comprovanteUrl = null;

            if (comprovante) {
                const resUpload = await fetchWithAuth(
                    `${API_URL}/obras/${obraId}/caixa/upload-comprovante`,
                    {
                        method: 'POST',
                        body: JSON.stringify({ imagem: comprovante })
                    }
                );

                if (resUpload.ok) {
                    const dataUpload = await resUpload.json();
                    comprovanteUrl = dataUpload.comprovante_url;
                }
            }

            const response = await fetchWithAuth(
                `${API_URL}/obras/${obraId}/caixa/movimentacoes`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        tipo,
                        valor: parseFloat(valor),
                        descricao: descricao.trim(),
                        observacoes: observacoes.trim() || null,
                        comprovante_url: comprovanteUrl
                    })
                }
            );

            if (!response.ok) throw new Error('Erro ao salvar movimentação');

            notify.success('Movimentação registrada com sucesso!');
            onSave();
        } catch (err) {
            logger.error('Erro ao salvar movimentação:', err);
            notify.error('Erro ao salvar movimentação');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Nova Movimentação"
            width="large"
            scrollBody={true}
            footer={
                <>
                    <button type="button" className="m-btn-cancel" onClick={onClose} disabled={isSubmitting || isCompressing}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="m-btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isCompressing}
                    >
                        <i className="ti ti-device-floppy" aria-hidden="true"></i>
                        {isCompressing ? 'Comprimindo...' : isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </>
            }
        >
            <div className="m-field">
                <label className="m-label">Tipo</label>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                        <input
                            type="radio"
                            value="Saída"
                            checked={tipo === 'Saída'}
                            onChange={e => setTipo(e.target.value)}
                        />
                        Saída
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                        <input
                            type="radio"
                            value="Entrada"
                            checked={tipo === 'Entrada'}
                            onChange={e => setTipo(e.target.value)}
                        />
                        Entrada
                    </label>
                </div>
            </div>

            <div className="m-field">
                <label className="m-label">Valor (R$)</label>
                <input
                    className="m-input"
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    placeholder="0,00"
                />
            </div>

            <div className="m-field">
                <label className="m-label">Descrição</label>
                <textarea
                    className="m-textarea"
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Ex: Cimento urgência laje 3º andar"
                    rows={3}
                />
            </div>

            <div className="m-field">
                <label className="m-label">Observações <span className="m-label-opt">(opcional)</span></label>
                <textarea
                    className="m-textarea"
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Informações adicionais..."
                    rows={2}
                />
            </div>

            <div className="m-field">
                <label className="m-label">Comprovante <span className="m-label-opt">(opcional)</span></label>
                <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleComprovanteChange}
                    disabled={isCompressing}
                    style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
                />
                {isCompressing && (
                    <p style={{ color: 'var(--status-info)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        Comprimindo imagem...
                    </p>
                )}
                {previewComprovante && (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                        <img
                            src={previewComprovante}
                            alt="Preview do comprovante"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                borderRadius: 'var(--radius-md)',
                                border: '0.5px solid var(--border-default)',
                            }}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ModalNovaMovimentacaoCaixa;
