import React, { useState } from 'react';
import Modal from './Modal';
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
                logger.debug('🔄 Comprimindo imagem do comprovante...');

                const compressedImages = await compressImages([file]);

                if (compressedImages && compressedImages.length > 0) {
                    const compressed = compressedImages[0];
                    setComprovante(compressed.base64);
                    setPreviewComprovante(compressed.base64);
                    logger.debug('✅ Imagem comprimida com sucesso');
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

            notify.success('✅ Movimentação registrada com sucesso!');
            onSave();
        } catch (err) {
            logger.error('Erro ao salvar movimentação:', err);
            notify.error('Erro ao salvar movimentação');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal customWidth="600px">
            <div style={{ padding: '30px' }}>
                <h2 style={{ fontSize: '1.8em', marginBottom: '25px' }}>💸 Nova Movimentação</h2>

                {/* Tipo */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Tipo:
                    </label>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Saída"
                                checked={tipo === 'Saída'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📤 Saída</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                value="Entrada"
                                checked={tipo === 'Entrada'}
                                onChange={e => setTipo(e.target.value)}
                                style={{ transform: 'scale(1.3)' }}
                            />
                            <span style={{ fontSize: '1.1em' }}>📥 Entrada</span>
                        </label>
                    </div>
                </div>

                {/* Valor */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Valor (R$):
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        placeholder="0,00"
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>

                {/* Descrição */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Descrição:
                    </label>
                    <textarea
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Ex: Cimento urgência laje 3º andar"
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1.1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Observações */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Observações (opcional):
                    </label>
                    <textarea
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        placeholder="Informações adicionais..."
                        rows={2}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '1em',
                            borderRadius: '5px',
                            border: '1px solid #ddd',
                            resize: 'vertical'
                        }}
                    />
                </div>

                {/* Comprovante */}
                <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        Comprovante (opcional):
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleComprovanteChange}
                        disabled={isCompressing}
                        style={{ marginBottom: '15px' }}
                    />
                    {isCompressing && (
                        <div style={{ color: '#007bff', fontSize: '0.9em', marginBottom: '10px' }}>
                            ⏳ Comprimindo imagem...
                        </div>
                    )}
                    {previewComprovante && (
                        <div style={{ marginTop: '15px' }}>
                            <img
                                src={previewComprovante}
                                alt="Preview"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    borderRadius: '8px',
                                    border: '2px solid #ddd'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
                    <button onClick={onClose} className="voltar-btn" style={{ padding: '12px 24px', fontSize: '1.1em' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isCompressing}
                        className="submit-btn"
                        style={{ padding: '12px 24px', fontSize: '1.1em' }}
                    >
                        {isCompressing ? '⏳ Comprimindo...' : isSubmitting ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalNovaMovimentacaoCaixa;
