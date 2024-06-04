import { GoogleGenerativeAI } from "@google/generative-ai";
import { TextPart, VertexAI, FunctionDeclarationSchemaType, HarmBlockThreshold, HarmCategory } from "@google-cloud/vertexai";
export class pdftoJson {
    constructor() { }
    vertex_ai = new VertexAI({
        project: 'finance-app-423618',
        location: 'us-central1'
    })
    public mimeType = ''
    public fileData = ''
    private model = 'gemini-1.5-flash-preview-0514';
    private generativeModel = this.vertex_ai.preview.getGenerativeModel({
        model: this.model,
        generationConfig: {
            'maxOutputTokens': 8192,
            'temperature': 1,
            'topP': 0.95,
        },
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            }
        ],
        systemInstruction: {
            parts: [{ text: `You are a PDF to JSON converter, rewrite the data from the pdf into the following categories, Month, description, debit and credit, and total, and provide it in JSON format suitable for a developer to receive. if there's any issue provide an empty array` }],
            role: 'model'
        },
    });

    private document1 = {
        inlineData: {
            mimeType: this.mimeType,
            data: this.fileData
        }
    };
   public async generateContent() {
        const req = {
            contents: [
                { role: 'user', parts: [this.document1, { text: `Here\'s the data` }] }
            ],
        };

        const streamingResp = await this.generativeModel.generateContentStream(req);

        for await (const item of streamingResp.stream) {
            process.stdout.write('stream chunk: ' + JSON.stringify(item) + '\n');
        }

        process.stdout.write('aggregated response: ' + JSON.stringify(await streamingResp.response));
    }
}