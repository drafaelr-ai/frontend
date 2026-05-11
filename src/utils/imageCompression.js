import { logger } from './logger';
/**
 * Utilitário para compressão de imagens
 * Usado no Diário de Obras e Caixa de Obra
 */

/**
 * Comprime uma única imagem
 * @param {File} file - Arquivo de imagem
 * @param {Object} options - Opções de compressão
 * @returns {Promise<{base64: string, nome: string}>}
 */
export const compressImage = (file, options = {}) => {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.7,
    } = options;

    return new Promise((resolve, reject) => {
        // Se não for imagem, retornar como está
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    base64: reader.result,
                    nome: file.name
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calcular dimensões mantendo proporção
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                // Criar canvas e desenhar imagem redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para base64 com qualidade reduzida
                const base64 = canvas.toDataURL('image/jpeg', quality);
                
                logger.debug(`📸 Imagem comprimida: ${file.name}`);
                logger.debug(`   Original: ${(file.size / 1024).toFixed(1)}KB`);
                logger.debug(`   Comprimida: ${(base64.length * 0.75 / 1024).toFixed(1)}KB`);
                logger.debug(`   Dimensões: ${img.width}x${img.height} → ${Math.round(width)}x${Math.round(height)}`);

                resolve({
                    base64,
                    nome: file.name.replace(/\.[^/.]+$/, '.jpg') // Trocar extensão para .jpg
                });
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
    });
};

/**
 * Comprime múltiplas imagens
 * @param {File[]} files - Array de arquivos
 * @param {Object} options - Opções de compressão
 * @returns {Promise<Array<{base64: string, nome: string}>>}
 */
export const compressImages = async (files, options = {}) => {
    const results = [];
    
    for (const file of files) {
        try {
            const compressed = await compressImage(file, options);
            results.push(compressed);
        } catch (err) {
            logger.error(`Erro ao comprimir ${file.name}:`, err);
            // Em caso de erro, tenta usar a imagem original
            try {
                const reader = new FileReader();
                const base64 = await new Promise((resolve, reject) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                results.push({ base64, nome: file.name });
            } catch (fallbackErr) {
                logger.error(`Erro no fallback para ${file.name}:`, fallbackErr);
            }
        }
    }
    
    return results;
};

export default { compressImage, compressImages };
