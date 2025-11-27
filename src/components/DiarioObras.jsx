import React, { useState, useEffect } from 'react';
import { compressImages } from '../utils/imageCompression'; // ⭐ COMPRESSÃO DE IMAGENS

const API_URL = 'https://backend-production-78c9.up.railway.app';

// Helper para formatar datas
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

// Helper para fetch com autenticação
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 422) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        throw new Error('Sessão expirada. Faça o login novamente.');
    }

    return response;
};

// --- MODAL PARA ADICIONAR/EDITAR ENTRADA ---
const DiarioFormModal = ({ entrada, obraId, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        data: entrada?.data || new Date().toISOString().split('T')[0],
        titulo: entrada?.titulo || '',
        descricao: entrada?.descricao || '',
        clima: entrada?.clima || '',
        temperatura: entrada?.temperatura || '',
        atividades_realizadas: entrada?.atividades_realizadas || '',
        equipe_presente: entrada?.equipe_presente || '',
        materiais_utilizados: entrada?.materiais_utilizados || '',
        equipamentos_utilizados: entrada?.equipamentos_utilizados || '',
        observacoes: entrada?.observacoes || ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [arquivos, setArquivos] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const url = entrada
                ? `${API_URL}/diario/${entrada.id}`
                : `${API_URL}/obras/${obraId}/diario`;
            
            const method = entrada ? 'PUT' : 'POST';

            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || 'Erro ao salvar entrada');
            }

            const data = await response.json();
            
            // Se houver arquivos, fazer upload de cada um
            if (arquivos.length > 0) {
                const entradaId = data.entrada?.id || data.id;
                
                try {
                    // ⭐ COMPRIMIR IMAGENS ANTES DE ENVIAR
                    console.log('🔄 Comprimindo imagens...');
                    const compressedFiles = await compressImages(arquivos, {
                        maxWidth: 1920,
                        maxHeight: 1920,
                        quality: 0.8
                    });

                    for (const arquivo of compressedFiles) {
                        // Converter arquivo para base64
                        const base64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const base64String = reader.result.split(',')[1]; // Remove o prefixo data:...
                                resolve(base64String);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(arquivo);
                        });
                        
                        const uploadResponse = await fetchWithAuth(
                            `${API_URL}/diario/${entradaId}/imagens`,
                            {
                                method: 'POST',
                                body: JSON.stringify({
                                    nome: arquivo.name,
                                    base64: base64,
                                    legenda: ''
                                })
                            }
                        );
                        
                        if (!uploadResponse.ok) {
                            console.error('Erro ao fazer upload de arquivo:', arquivo.name);
                        }
                    }
                } catch (uploadError) {
                    console.error('Erro no upload de arquivos:', uploadError);
                    // Continua mesmo se houver erro no upload de imagens
                }
            }
            
            // Garantir que o callback seja chamado SEMPRE, independente dos uploads
            onSave(data);
            onClose();
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleArquivosChange = (e) => {
        const files = Array.from(e.target.files);
        setArquivos(files);
    };

    const removerArquivo = (index) => {
        setArquivos(prev => prev.filter((_, i) => i !== index));
    };

    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
        },
        content: {
            background: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        formGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            color: '#333'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            boxSizing: 'border-box'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            minHeight: '100px',
            resize: 'vertical',
            boxSizing: 'border-box'
        },
        row: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            marginBottom: '20px'
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            marginTop: '20px'
        }
    };

    return (
        <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={modalStyles.content}>
                <h2 style={{ marginTop: 0, color: 'var(--cor-primaria)' }}>
                    {entrada ? '✏️ Editar Entrada' : '➕ Nova Entrada no Diário'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div style={modalStyles.row}>
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Data *</label>
                            <input
                                type="date"
                                value={formData.data}
                                onChange={(e) => handleChange('data', e.target.value)}
                                style={modalStyles.input}
                                required
                            />
                        </div>
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Título *</label>
                            <input
                                type="text"
                                value={formData.titulo}
                                onChange={(e) => handleChange('titulo', e.target.value)}
                                style={modalStyles.input}
                                placeholder="Ex: Fundação concluída"
                                required
                            />
                        </div>
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Descrição</label>
                        <textarea
                            value={formData.descricao}
                            onChange={(e) => handleChange('descricao', e.target.value)}
                            style={modalStyles.textarea}
                            placeholder="Descrição geral do dia..."
                        />
                    </div>

                    <div style={modalStyles.row}>
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Clima</label>
                            <select
                                value={formData.clima}
                                onChange={(e) => handleChange('clima', e.target.value)}
                                style={modalStyles.input}
                            >
                                <option value="">Selecione...</option>
                                <option value="Ensolarado">☀️ Ensolarado</option>
                                <option value="Parcialmente nublado">⛅ Parcialmente nublado</option>
                                <option value="Nublado">☁️ Nublado</option>
                                <option value="Chuvoso">🌧️ Chuvoso</option>
                            </select>
                        </div>
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Temperatura</label>
                            <input
                                type="text"
                                value={formData.temperatura}
                                onChange={(e) => handleChange('temperatura', e.target.value)}
                                style={modalStyles.input}
                                placeholder="Ex: 28°C"
                            />
                        </div>
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Atividades Realizadas</label>
                        <textarea
                            value={formData.atividades_realizadas}
                            onChange={(e) => handleChange('atividades_realizadas', e.target.value)}
                            style={modalStyles.textarea}
                            placeholder="Descreva as atividades realizadas no dia..."
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Equipe Presente</label>
                        <textarea
                            value={formData.equipe_presente}
                            onChange={(e) => handleChange('equipe_presente', e.target.value)}
                            style={{ ...modalStyles.textarea, minHeight: '60px' }}
                            placeholder="Ex: João (Pedreiro), Maria (Servente), Pedro (Eletricista)"
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Materiais Utilizados</label>
                        <textarea
                            value={formData.materiais_utilizados}
                            onChange={(e) => handleChange('materiais_utilizados', e.target.value)}
                            style={{ ...modalStyles.textarea, minHeight: '60px' }}
                            placeholder="Ex: 10 sacos de cimento, 2m³ de areia"
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Equipamentos Utilizados</label>
                        <textarea
                            value={formData.equipamentos_utilizados}
                            onChange={(e) => handleChange('equipamentos_utilizados', e.target.value)}
                            style={{ ...modalStyles.textarea, minHeight: '60px' }}
                            placeholder="Ex: Betoneira, Furadeira, Andaime"
                        />
                    </div>

                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>Observações</label>
                        <textarea
                            value={formData.observacoes}
                            onChange={(e) => handleChange('observacoes', e.target.value)}
                            style={{ ...modalStyles.textarea, minHeight: '80px' }}
                            placeholder="Observações gerais, problemas encontrados, etc..."
                        />
                    </div>

                    {/* Campo de Anexos */}
                    <div style={modalStyles.formGroup}>
                        <label style={modalStyles.label}>📎 Anexos (Fotos e PDFs)</label>
                        <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={handleArquivosChange}
                            style={{
                                ...modalStyles.input,
                                padding: '8px',
                                cursor: 'pointer'
                            }}
                        />
                        {arquivos.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '8px' }}>
                                    {arquivos.length} arquivo(s) selecionado(s):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {arquivos.map((arquivo, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                backgroundColor: '#f8f9fa',
                                                borderRadius: '4px',
                                                border: '1px solid #e0e0e0'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.2em' }}>
                                                    {arquivo.type.startsWith('image/') ? '🖼️' : '📄'}
                                                </span>
                                                <span style={{ fontSize: '0.9em' }}>
                                                    {arquivo.name}
                                                    <span style={{ color: '#999', marginLeft: '8px' }}>
                                                        ({(arquivo.size / 1024).toFixed(0)} KB)
                                                    </span>
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removerArquivo(index)}
                                                style={{
                                                    backgroundColor: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85em'
                                                }}
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div style={{ color: 'var(--cor-vermelho)', marginBottom: '15px', padding: '10px', backgroundColor: '#fee', borderRadius: '4px' }}>
                            {error}
                        </div>
                    )}

                    <div style={modalStyles.buttonGroup}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="voltar-btn"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={isLoading}
                        >
                            {isLoading 
                                ? (arquivos.length > 0 ? 'Salvando e enviando arquivos...' : 'Salvando...') 
                                : entrada ? 'Atualizar' : 'Adicionar'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MODAL PARA VISUALIZAR DETALHES DA ENTRADA ---
const DiarioDetalhesModal = ({ entrada, onClose, onEdit, onDelete, onAddImage }) => {
    const [imageFiles, setImageFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async () => {
        if (imageFiles.length === 0) {
            alert('Selecione pelo menos um arquivo');
            return;
        }

        setIsUploading(true);
        try {
            // ⭐ COMPRIMIR IMAGENS ANTES DE ENVIAR
            console.log('🔄 Comprimindo imagens...');
            const compressedFiles = await compressImages(imageFiles, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.8
            });

            for (const file of compressedFiles) {
                // Converter arquivo para base64
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64String = reader.result.split(',')[1]; // Remove o prefixo data:...
                        resolve(base64String);
                    };
                    reader.readAsDataURL(file);
                });

                const response = await fetchWithAuth(`${API_URL}/diario/${entrada.id}/imagens`, {
                    method: 'POST',
                    body: JSON.stringify({
                        nome: file.name,
                        base64: base64,
                        legenda: ''
                    })
                });

                if (!response.ok) {
                    throw new Error('Erro ao enviar arquivo');
                }
            }

            alert('Arquivos adicionados com sucesso!');
            setImageFiles([]);
            onAddImage(); // Recarrega os dados
        } catch (err) {
            alert('Erro ao enviar arquivos: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteImage = async (imagemId) => {
        if (!window.confirm('Deseja realmente excluir esta imagem?')) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/diario/imagens/${imagemId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir imagem');
            }

            alert('Imagem excluída com sucesso!');
            onAddImage(); // Recarrega os dados
        } catch (err) {
            alert('Erro ao excluir imagem: ' + err.message);
        }
    };

    const modalStyles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '20px'
        },
        content: {
            background: 'white',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        section: {
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
        },
        sectionTitle: {
            fontWeight: 'bold',
            color: 'var(--cor-primaria)',
            marginBottom: '10px',
            fontSize: '1.1em'
        },
        imageGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '15px'
        },
        imageCard: {
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        image: {
            width: '100%',
            height: '200px',
            objectFit: 'cover'
        },
        deleteImageBtn: {
            position: 'absolute',
            top: '5px',
            right: '5px',
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        buttonGroup: {
            display: 'flex',
            gap: '10px',
            justifyContent: 'space-between',
            marginTop: '20px',
            flexWrap: 'wrap'
        }
    };

    return (
        <div style={modalStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={modalStyles.content}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: 'var(--cor-primaria)' }}>
                        📋 {entrada.titulo}
                    </h2>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                        {formatDate(entrada.data)}
                    </div>
                </div>

                {entrada.descricao && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>📝 Descrição</div>
                        <div>{entrada.descricao}</div>
                    </div>
                )}

                {(entrada.clima || entrada.temperatura) && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>🌤️ Condições Climáticas</div>
                        <div>
                            {entrada.clima && <span><strong>Clima:</strong> {entrada.clima}</span>}
                            {entrada.clima && entrada.temperatura && <span> | </span>}
                            {entrada.temperatura && <span><strong>Temperatura:</strong> {entrada.temperatura}</span>}
                        </div>
                    </div>
                )}

                {entrada.atividades_realizadas && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>✅ Atividades Realizadas</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.atividades_realizadas}</div>
                    </div>
                )}

                {entrada.equipe_presente && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>👷 Equipe Presente</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.equipe_presente}</div>
                    </div>
                )}

                {entrada.materiais_utilizados && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>🧱 Materiais Utilizados</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.materiais_utilizados}</div>
                    </div>
                )}

                {entrada.equipamentos_utilizados && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>🔧 Equipamentos Utilizados</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.equipamentos_utilizados}</div>
                    </div>
                )}

                {entrada.observacoes && (
                    <div style={modalStyles.section}>
                        <div style={modalStyles.sectionTitle}>💭 Observações</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{entrada.observacoes}</div>
                    </div>
                )}

                {/* Seção de Anexos */}
                <div style={modalStyles.section}>
                    <div style={modalStyles.sectionTitle}>📎 Anexos (Fotos e PDFs)</div>
                    
                    {/* Upload de novos anexos */}
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                        <input
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={(e) => setImageFiles(Array.from(e.target.files))}
                            style={{ marginBottom: '10px' }}
                        />
                        {imageFiles.length > 0 && (
                            <button
                                onClick={handleImageUpload}
                                disabled={isUploading}
                                className="submit-btn"
                                style={{ padding: '8px 15px', fontSize: '0.9em' }}
                            >
                                {isUploading ? 'Enviando...' : `Enviar ${imageFiles.length} arquivo(s)`}
                            </button>
                        )}
                    </div>

                    {/* Grid de anexos existentes */}
                    {entrada.imagens && entrada.imagens.length > 0 ? (
                        <div style={modalStyles.imageGrid}>
                            {entrada.imagens.map(img => {
                                const isPDF = img.arquivo_nome && img.arquivo_nome.toLowerCase().endsWith('.pdf');
                                
                                return (
                                    <div key={img.id} style={modalStyles.imageCard}>
                                        {isPDF ? (
                                            // Visualização para PDFs
                                            <div style={{
                                                width: '100%',
                                                height: '200px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '8px'
                                            }}>
                                                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
                                                <div style={{ fontSize: '0.9em', fontWeight: 'bold', textAlign: 'center', padding: '0 10px' }}>
                                                    {img.arquivo_nome || 'Documento PDF'}
                                                </div>
                                                <a
                                                    href={`data:application/pdf;base64,${img.arquivo_base64 || img.imagem_base64}`}
                                                    download={img.arquivo_nome || 'documento.pdf'}
                                                    style={{
                                                        marginTop: '10px',
                                                        padding: '5px 10px',
                                                        backgroundColor: 'var(--cor-primaria)',
                                                        color: 'white',
                                                        borderRadius: '4px',
                                                        textDecoration: 'none',
                                                        fontSize: '0.85em'
                                                    }}
                                                >
                                                    📥 Baixar
                                                </a>
                                            </div>
                                        ) : (
                                            // Visualização para imagens
                                            <img
                                                src={`data:image/jpeg;base64,${img.arquivo_base64 || img.imagem_base64}`}
                                                alt={img.legenda || img.arquivo_nome || 'Imagem do diário'}
                                                style={modalStyles.image}
                                            />
                                        )}
                                        <button
                                            onClick={() => handleDeleteImage(img.id)}
                                            style={modalStyles.deleteImageBtn}
                                        >
                                            🗑️
                                        </button>
                                        {img.legenda && (
                                            <div style={{ padding: '8px', fontSize: '0.9em', backgroundColor: 'white' }}>
                                                {img.legenda}
                                            </div>
                                        )}
                                        {!isPDF && img.arquivo_nome && (
                                            <div style={{ padding: '8px', fontSize: '0.85em', backgroundColor: 'white', color: '#666' }}>
                                                {img.arquivo_nome}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                            Nenhum anexo adicionado
                        </div>
                    )}
                </div>

                <div style={modalStyles.buttonGroup}>
                    <button onClick={onClose} className="voltar-btn">
                        Fechar
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => onEdit(entrada)} className="submit-btn" style={{ backgroundColor: '#6c757d' }}>
                            ✏️ Editar
                        </button>
                        <button onClick={() => onDelete(entrada.id)} className="voltar-btn">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DO DIÁRIO ---
const DiarioObras = ({ obra, obraId, obraNome, onClose, embedded }) => {
    // Suporte a ambos formatos de props
    const obraData = obra || { id: obraId, nome: obraNome };
    
    const [entradas, setEntradas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const [entradaSelecionada, setEntradaSelecionada] = useState(null);
    const [filtroData, setFiltroData] = useState('');

    const carregarEntradas = async () => {
        // Verificar se obra existe antes de carregar
        if (!obraData?.id) {
            console.log('Obra não disponível ainda');
            setIsLoading(false);
            return;
        }
        
        try {
            setIsLoading(true);
            console.log('Carregando entradas da obra:', obraData.id);
            const response = await fetchWithAuth(`${API_URL}/obras/${obraData.id}/diario`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar diário');
            }

            const data = await response.json();
            console.log('Entradas recebidas:', data);
            
            // Garantir que data seja sempre um array
            // Backend pode retornar array direto ou objeto com propriedade 'entradas'
            let entradasArray = [];
            if (Array.isArray(data)) {
                entradasArray = data;
            } else if (data && Array.isArray(data.entradas)) {
                entradasArray = data.entradas;
            } else if (data && Array.isArray(data.data)) {
                entradasArray = data.data;
            }
            
            console.log('Entradas processadas (array):', entradasArray);
            setEntradas(entradasArray);
        } catch (err) {
            console.error('Erro ao carregar entradas:', err);
            alert('Erro ao carregar o diário: ' + err.message);
            setEntradas([]); // Garantir que entradas seja um array vazio em caso de erro
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (obraData?.id) {
            carregarEntradas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [obraData?.id]);

    const handleSaveEntrada = async (novaEntrada) => {
        console.log('Entrada salva, recarregando lista...', novaEntrada);
        await carregarEntradas();
    };

    const handleDeleteEntrada = async (entradaId) => {
        if (!window.confirm('Deseja realmente excluir esta entrada?')) return;

        try {
            const response = await fetchWithAuth(`${API_URL}/diario/${entradaId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir entrada');
            }

            alert('Entrada excluída com sucesso!');
            carregarEntradas();
            setIsDetalhesModalOpen(false);
        } catch (err) {
            alert('Erro ao excluir entrada: ' + err.message);
        }
    };

    const handleGerarRelatorio = async () => {
        try {
            let url = `${API_URL}/obras/${obraData.id}/diario/relatorio`;
            
            if (filtroData) {
                url += `?data_inicio=${filtroData}&data_fim=${filtroData}`;
            }

            const response = await fetchWithAuth(url);
            
            if (!response.ok) {
                throw new Error('Erro ao gerar relatório');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `diario_${obraData.nome || 'obra'}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            alert('Erro ao gerar relatório: ' + err.message);
        }
    };

    const entradasFiltradas = filtroData
        ? (Array.isArray(entradas) ? entradas : []).filter(e => e.data === filtroData)
        : (Array.isArray(entradas) ? entradas : []);

    // Verificar se obra existe antes de renderizar
    if (!obraData?.id) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 999,
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center'
                }}>
                    <p>Carregando dados da obra...</p>
                    <button onClick={onClose} className="voltar-btn">Fechar</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '30px',
                maxWidth: '1200px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, color: 'var(--cor-primaria)' }}>
                        📔 Diário de Obras - {obraData.nome}
                    </h2>
                    <button onClick={onClose} className="voltar-btn">✕ Fechar</button>
                </div>

                {/* Barra de ações */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => {
                            setEntradaSelecionada(null);
                            setIsFormModalOpen(true);
                        }}
                        className="submit-btn"
                    >
                        ➕ Nova Entrada
                    </button>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={filtroData}
                            onChange={(e) => setFiltroData(e.target.value)}
                            style={{
                                padding: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                        />
                        {filtroData && (
                            <button
                                onClick={() => setFiltroData('')}
                                className="voltar-btn"
                                style={{ padding: '8px 12px' }}
                            >
                                Limpar
                            </button>
                        )}
                        <button
                            onClick={handleGerarRelatorio}
                            className="submit-btn"
                            style={{ backgroundColor: '#6c757d' }}
                        >
                            📄 Gerar PDF
                        </button>
                    </div>
                </div>

                {/* Lista de entradas */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
                ) : entradasFiltradas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        {filtroData ? 'Nenhuma entrada encontrada para esta data' : 'Nenhuma entrada no diário ainda'}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {entradasFiltradas.map(entrada => (
                            <div
                                key={entrada.id}
                                onClick={() => {
                                    setEntradaSelecionada(entrada);
                                    setIsDetalhesModalOpen(true);
                                }}
                                style={{
                                    padding: '20px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.borderColor = 'var(--cor-primaria)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = '#e0e0e0';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'var(--cor-primaria)' }}>{entrada.titulo}</h3>
                                        <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                            📅 {formatDate(entrada.data)}
                                            {entrada.clima && ` • ${entrada.clima}`}
                                            {entrada.temperatura && ` • ${entrada.temperatura}`}
                                        </div>
                                    </div>
                                    {entrada.imagens && entrada.imagens.length > 0 && (
                                        <div style={{
                                            backgroundColor: 'var(--cor-primaria)',
                                            color: 'white',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.85em'
                                        }}>
                                            📎 {entrada.imagens.length}
                                        </div>
                                    )}
                                </div>
                                {entrada.descricao && (
                                    <p style={{
                                        margin: '10px 0 0 0',
                                        color: '#555',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}>
                                        {entrada.descricao}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modais */}
            {isFormModalOpen && (
                <DiarioFormModal
                    entrada={entradaSelecionada}
                    obraId={obraData.id}
                    onClose={() => {
                        setIsFormModalOpen(false);
                        setEntradaSelecionada(null);
                    }}
                    onSave={handleSaveEntrada}
                />
            )}

            {isDetalhesModalOpen && entradaSelecionada && (
                <DiarioDetalhesModal
                    entrada={entradaSelecionada}
                    onClose={() => {
                        setIsDetalhesModalOpen(false);
                        setEntradaSelecionada(null);
                    }}
                    onEdit={(entrada) => {
                        setIsDetalhesModalOpen(false);
                        setEntradaSelecionada(entrada);
                        setIsFormModalOpen(true);
                    }}
                    onDelete={handleDeleteEntrada}
                    onAddImage={carregarEntradas}
                />
            )}
        </div>
    );
};

export default DiarioObras;
