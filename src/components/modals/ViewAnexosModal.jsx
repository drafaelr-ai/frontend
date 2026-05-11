import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { fetchWithAuth } from '../../auth/fetchWithAuth';
import { API_URL } from '../../config';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';

const ViewAnexosModal = ({ orcamento, onClose }) => {
    // ... (código inalterado)
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
        <Modal onClose={onClose}>
            <h2>Anexos de: {orcamento.descricao}</h2>
            <div className="form-group" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px' }}>
                {isLoading ? <p>Carregando anexos...</p> : (
                    <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                        {anexos.length > 0 ? anexos.map(anexo => (
                            <li key={anexo.id} style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '1.1em' }}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleOpenAnexo(anexo.id); }}
                                    title={`Abrir ${anexo.filename}`}
                                    style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    📎 {anexo.filename}
                                </a>
                            </li>
                        )) : <p>Nenhum anexo encontrado.</p>}
                    </ul>
                )}
            </div>
            <div className="form-actions" style={{marginTop: '20px'}}>
                <button type="button" onClick={onClose} className="cancel-btn" style={{width: '100%'}}>Fechar</button>
            </div>
        </Modal>
    );
};

export default ViewAnexosModal;
