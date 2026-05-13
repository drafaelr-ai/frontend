import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const ViewAnexosModal = ({ orcamento, onClose }) => {
    const [anexos, setAnexos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (orcamento) {
            setIsLoading(true);
            fetchWithAuth(`${API_URL}/orcamentos/${orcamento.id}/anexos`)
                .then(res => res.json())
                .then(data => {
                    setAnexos(Array.isArray(data) ? data : []);
                    setIsLoading(false);
                })
                .catch(err => {
                    logger.error("Erro ao buscar anexos:", err);
                    setIsLoading(false);
                });
        }
    }, [orcamento]);

    const handleOpenAnexo = (anexoId) => {
        fetchWithAuth(`${API_URL}/anexos/${anexoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao buscar anexo');
                return res.blob();
            })
            .then(blob => {
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            })
            .catch(err => notify.error(`Erro ao abrir anexo: ${err.message}`));
    };

    if (!orcamento) return null;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Anexos"
            subtitle={orcamento.descricao}
            width="default"
            scrollBody={true}
            footer={
                <button type="button" className="m-btn-cancel" onClick={onClose}>Fechar</button>
            }
        >
            {isLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Carregando anexos...</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {anexos.length > 0 ? anexos.map(anexo => (
                        <li
                            key={anexo.id}
                            style={{
                                padding: 'var(--space-2) 0',
                                borderBottom: '0.5px solid var(--border-subtle)',
                                fontSize: 'var(--text-base)',
                            }}
                        >
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                title={`Abrir ${anexo.filename}`}
                                style={{ color: 'var(--status-info)', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                <i className="ti ti-paperclip" aria-hidden="true" style={{ marginRight: 'var(--space-1)' }}></i>
                                {anexo.filename}
                            </a>
                        </li>
                    )) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Nenhum anexo encontrado.</p>
                    )}
                </ul>
            )}
        </Modal>
    );
};

export default ViewAnexosModal;
