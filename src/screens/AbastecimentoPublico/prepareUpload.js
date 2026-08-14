const MB = 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * MB;
const MAX_SOURCE_IMAGE_BYTES = 25 * MB;
const MAX_BACKEND_SOURCE_BYTES = 10 * MB;
const MAX_PREPARED_BYTES = 6 * MB;

const isImage = (file) => (
    String(file?.type || '').startsWith('image/')
    || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file?.name || '')
);

const isDirectImage = (file) => (
    ['image/jpeg', 'image/png', 'image/webp'].includes(String(file?.type || '').toLowerCase())
);

const jpgName = (name) => `${String(name || 'comprovante').replace(/\.[^/.]+$/, '')}.jpg`;

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => (blob ? resolve(blob) : reject(new Error('Falha ao reduzir a foto.'))),
            'image/jpeg',
            0.78,
        );
    });
}

/**
 * Prepara uma foto de comprovante sem transformá-la em base64.
 *
 * No iPhone, uma foto de poucos MB pode ocupar centenas de MB depois de
 * decodificada. `createImageBitmap` com `resizeWidth` permite ao WebKit reduzir
 * durante a decodificação; canvas e bitmap são liberados logo após gerar o JPG.
 */
export async function prepareFuelReceiptUpload(file) {
    if (!file) throw new Error('Escolha uma foto ou PDF do comprovante.');

    if (!isImage(file)) {
        if (file.size > MAX_DOCUMENT_BYTES) {
            throw new Error('O PDF deve ter no máximo 10 MB.');
        }
        return file;
    }

    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        throw new Error('A foto é muito grande. Tire outra foto usando a câmera do link.');
    }

    // JPG/PNG/WEBP dentro do teto do backend seguem sem ser abertos no
    // aparelho. Essa é a opção de menor uso de memória no iPhone; o backend
    // usa redução JPEG durante a decodificação antes do OCR e do Storage.
    if (file.size <= MAX_BACKEND_SOURCE_BYTES && isDirectImage(file)) return file;

    if (typeof globalThis.createImageBitmap !== 'function') {
        throw new Error('O aparelho não conseguiu otimizar a foto. Tire outra foto usando a câmera do link.');
    }

    let bitmap;
    let canvas;
    try {
        // Informar apenas a largura preserva a proporção. Em fotos verticais,
        // o maior lado pode passar de 1600, mas o bitmap continua pequeno e
        // mantém texto suficiente para a leitura do cupom.
        bitmap = await globalThis.createImageBitmap(file, {
            resizeWidth: 1600,
            resizeQuality: 'high',
            imageOrientation: 'from-image',
        });

        let width = bitmap.width;
        let height = bitmap.height;
        const maiorLado = Math.max(width, height);
        if (maiorLado > 2200) {
            const escala = 2200 / maiorLado;
            width = Math.max(1, Math.round(width * escala));
            height = Math.max(1, Math.round(height * escala));
        }

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('O aparelho não conseguiu preparar a foto.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);

        const blob = await canvasToBlob(canvas);
        if (blob.size > MAX_PREPARED_BYTES) {
            throw new Error('A foto continuou muito grande após a otimização. Tire outra foto.');
        }
        if (blob.size >= file.size && file.size <= MAX_BACKEND_SOURCE_BYTES && isDirectImage(file)) {
            return file;
        }
        return new File([blob], jpgName(file.name), {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch (error) {
        // Uma foto moderada em JPG/PNG ainda pode ser tratada com segurança no
        // backend. Para arquivos maiores, não reenviamos o original: isso
        // repetiria o erro de memória que estamos evitando.
        if (file.size <= MAX_BACKEND_SOURCE_BYTES && isDirectImage(file)) return file;
        throw new Error('O aparelho ficou sem memória para preparar a foto. Tire outra foto usando a câmera do link.');
    } finally {
        bitmap?.close?.();
        if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
        }
    }
}

export const receiptUploadLimits = {
    MAX_DOCUMENT_BYTES,
    MAX_SOURCE_IMAGE_BYTES,
    MAX_BACKEND_SOURCE_BYTES,
    MAX_PREPARED_BYTES,
};
