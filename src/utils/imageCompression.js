/**
 * Função para comprimir e redimensionar imagens automaticamente
 * 
 * @param {File} file - Arquivo de imagem original
 * @param {Object} options - Opções de compressão
 * @returns {Promise<File>} - Arquivo comprimido
 */

const compressImage = async (file, options = {}) => {
    const {
        maxWidth = 1920,           // Largura máxima (pixels)
        maxHeight = 1920,          // Altura máxima (pixels)
        quality = 0.8,             // Qualidade JPEG (0.0 a 1.0)
        outputFormat = 'image/jpeg' // Formato de saída
    } = options;

    return new Promise((resolve, reject) => {
        // Criar um leitor de arquivo
        const reader = new FileReader();
        
        reader.onload = (e) => {
            // Criar elemento de imagem
            const img = new Image();
            
            img.onload = () => {
                // Criar canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calcular novas dimensões mantendo proporção
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                // Configurar canvas com novas dimensões
                canvas.width = width;
                canvas.height = height;
                
                // Desenhar imagem redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converter canvas para Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Erro ao comprimir imagem'));
                            return;
                        }
                        
                        // Criar novo arquivo com o blob comprimido
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^/.]+$/, '.jpg'), // Força extensão .jpg
                            {
                                type: outputFormat,
                                lastModified: Date.now()
                            }
                        );
                        
                        console.log(`📸 Imagem comprimida:`);
                        console.log(`   Original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                        console.log(`   Comprimida: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
                        console.log(`   Redução: ${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`);
                        
                        resolve(compressedFile);
                    },
                    outputFormat,
                    quality
                );
            };
            
            img.onerror = () => {
                reject(new Error('Erro ao carregar imagem'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo'));
        };
        
        reader.readAsDataURL(file);
    });
};

/**
 * Função para comprimir múltiplas imagens
 * 
 * @param {FileList|Array} files - Lista de arquivos
 * @param {Object} options - Opções de compressão
 * @returns {Promise<Array>} - Array de arquivos comprimidos
 */
const compressImages = async (files, options = {}) => {
    const fileArray = Array.from(files);
    const compressedFiles = [];
    
    for (const file of fileArray) {
        // Verificar se é imagem
        if (!file.type.startsWith('image/')) {
            compressedFiles.push(file); // Manter arquivo original se não for imagem
            continue;
        }
        
        try {
            const compressed = await compressImage(file, options);
            compressedFiles.push(compressed);
        } catch (error) {
            console.error('Erro ao comprimir imagem:', error);
            compressedFiles.push(file); // Em caso de erro, usar arquivo original
        }
    }
    
    return compressedFiles;
};

export { compressImage, compressImages };
