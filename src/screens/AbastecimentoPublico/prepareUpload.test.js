import { prepareFuelReceiptUpload, receiptUploadLimits } from './prepareUpload';

describe('prepareFuelReceiptUpload', () => {
    const originalCreateImageBitmap = global.createImageBitmap;
    let originalCreateElement;

    beforeEach(() => {
        originalCreateElement = document.createElement.bind(document);
    });

    afterEach(() => {
        global.createImageBitmap = originalCreateImageBitmap;
        document.createElement = originalCreateElement;
        jest.restoreAllMocks();
    });

    it('não abre uma foto JPEG dentro do teto seguro do backend', async () => {
        global.createImageBitmap = jest.fn();
        const file = new File(
            [new Uint8Array(8 * 1024 * 1024)],
            'cupom.jpg',
            { type: 'image/jpeg' },
        );

        await expect(prepareFuelReceiptUpload(file)).resolves.toBe(file);
        expect(global.createImageBitmap).not.toHaveBeenCalled();
    });

    it('reduz a foto grande, fecha o bitmap e devolve JPEG', async () => {
        const close = jest.fn();
        global.createImageBitmap = jest.fn().mockResolvedValue({ width: 1600, height: 2133, close });
        const context = { fillRect: jest.fn(), drawImage: jest.fn(), fillStyle: '' };
        const canvas = {
            width: 0,
            height: 0,
            getContext: jest.fn(() => context),
            toBlob: callback => callback(new Blob([new Uint8Array(5000)], { type: 'image/jpeg' })),
        };
        document.createElement = jest.fn(tag => (tag === 'canvas' ? canvas : originalCreateElement(tag)));
        const file = new File(
            [new Uint8Array(2 * 1024 * 1024)],
            'cupom-heic.heic',
            { type: 'image/heic' },
        );

        const prepared = await prepareFuelReceiptUpload(file);

        expect(prepared).toBeInstanceOf(File);
        expect(prepared.type).toBe('image/jpeg');
        expect(prepared.name).toBe('cupom-heic.jpg');
        expect(global.createImageBitmap).toHaveBeenCalledWith(file, expect.objectContaining({ resizeWidth: 1600 }));
        expect(close).toHaveBeenCalledTimes(1);
        expect(canvas.width).toBe(1);
        expect(canvas.height).toBe(1);
    });

    it('recusa PDF acima do limite sem tentar decodificar', async () => {
        const file = new File(
            [new Uint8Array(receiptUploadLimits.MAX_DOCUMENT_BYTES + 1)],
            'cupom.pdf',
            { type: 'application/pdf' },
        );

        await expect(prepareFuelReceiptUpload(file)).rejects.toThrow('no máximo 10 MB');
    });

    it('não envia a foto grande original quando o aparelho não consegue reduzi-la', async () => {
        global.createImageBitmap = undefined;
        const file = new File(
            [new Uint8Array(receiptUploadLimits.MAX_BACKEND_SOURCE_BYTES + 1)],
            'cupom.jpg',
            { type: 'image/jpeg' },
        );

        await expect(prepareFuelReceiptUpload(file)).rejects.toThrow('não conseguiu otimizar');
    });
});
