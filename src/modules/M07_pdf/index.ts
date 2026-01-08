export interface PDFPage {
    pageNumber: number;
    text: string;
    width: number;
    height: number;
}

export interface PDFDocument {
    id: string;
    filename: string;
    pages: PDFPage[];
    metadata: {
        title?: string;
        author?: string;
        createdAt?: Date;
        pageCount: number;
    };
}

export class PDFReader {
    async loadFromFile(filePath: string): Promise<PDFDocument> {
        // In production: use pdf.js or pdf-parse
        console.log(`[PDF] Loading: ${filePath}`);
        return {
            id: crypto.randomUUID(),
            filename: filePath.split('/').pop() || 'unknown.pdf',
            pages: [],
            metadata: { pageCount: 0 },
        };
    }

    async loadFromBuffer(buffer: ArrayBuffer): Promise<PDFDocument> {
        console.log(`[PDF] Loading from buffer (${buffer.byteLength} bytes)`);
        return {
            id: crypto.randomUUID(),
            filename: 'buffer.pdf',
            pages: [],
            metadata: { pageCount: 0 },
        };
    }

    async extractText(doc: PDFDocument): Promise<string> {
        return doc.pages.map(p => p.text).join('\n\n');
    }
}

let instance: PDFReader | null = null;

export function getPDFReader(): PDFReader {
    if (!instance) instance = new PDFReader();
    return instance;
}
