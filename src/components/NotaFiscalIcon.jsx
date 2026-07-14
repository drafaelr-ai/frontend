import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchWithAuth } from '../auth/fetchWithAuth';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import { notify } from '../utils/notify';
import VisualizarNotaFiscalModal from './modals/VisualizarNotaFiscalModal';

const NotaFiscalIcon = ({ item, itemType, obraId, onNotaAdded }) => {
    const [nota, setNota] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showVisualizacao, setShowVisualizacao] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef(null);
    const { user } = useAuth();

    useEffect(() => {
        carregarNotaFiscal();
    }, [item.id]);

    const carregarNotaFiscal = async () => {
        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`);
            const data = await response.json();

            const notaDoItem = data.find(n =>
                n.item_id === item.id && n.item_type === itemType
            );

            setNota(notaDoItem || null);
        } catch (error) {
            logger.error('Erro ao carregar nota fiscal:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            notify.warning('Apenas arquivos PDF, PNG ou JPG são permitidos');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            notify.warning('Arquivo muito grande. Tamanho máximo: 10MB');
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', item.id);
        formData.append('item_type', itemType);

        try {
            const response = await fetchWithAuth(`${API_URL}/obras/${obraId}/notas-fiscais`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro ao fazer upload');
            }

            const novaNota = await response.json();
            setNota(novaNota);

            if (onNotaAdded) {
                onNotaAdded();
            }
        } catch (error) {
            logger.error('Erro ao fazer upload:', error);
            notify.error('Erro ao anexar nota fiscal');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClick = (e) => {
        e.stopPropagation();

        if (nota) {
            setShowVisualizacao(true);
        } else if (user.role === 'administrador' || user.role === 'master') {
            fileInputRef.current?.click();
        }
    };

    const canUpload = user.role === 'administrador' || user.role === 'master';

    if (isLoading) {
        return (
            <span style={{
                fontSize: '1.1em',
                color: 'var(--text-muted)',
                cursor: 'default'
            }}>
                <i className="ti ti-loader-2" aria-hidden="true" />
            </span>
        );
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={isUploading}
            />

            <span
                onClick={handleClick}
                title={
                    nota
                        ? 'Clique para visualizar a nota fiscal'
                        : canUpload
                            ? 'Clique para anexar nota fiscal'
                            : 'Sem nota fiscal'
                }
                style={{
                    fontSize: '1.1em',
                    cursor: (nota || canUpload) ? 'pointer' : 'default',
                    color: nota ? 'var(--module-obras)' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    marginLeft: '8px'
                }}
                onMouseEnter={(e) => {
                    if (nota || canUpload) {
                        e.target.style.transform = 'scale(1.2)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                }}
            >
                {isUploading
                    ? <i className="ti ti-loader-2" aria-hidden="true" />
                    : nota
                        ? <i className="ti ti-file-text" aria-hidden="true" />
                        : canUpload
                            ? <i className="ti ti-paperclip" aria-hidden="true" />
                            : ''}
            </span>

            {showVisualizacao && nota && (
                <VisualizarNotaFiscalModal
                    nota={nota}
                    onClose={() => setShowVisualizacao(false)}
                    onDelete={() => {
                        setNota(null);
                        if (onNotaAdded) {
                            onNotaAdded();
                        }
                    }}
                />
            )}
        </>
    );
};

export default NotaFiscalIcon;
