import { GoogleGenerativeAI } from '@google/generative-ai';

// Get provider from env
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

// Initialize Gemini client lazily
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
    return geminiClient;
}

// Simple text embeddings using character/word-based hashing (Bag of Words style)
// This is a fallback when no embedding API is available
function simpleTextEmbedding(text: string, dimensions: number = 768): number[] {
    const embedding = new Array(dimensions).fill(0);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

    // Use word hashing to create a simple embedding (Order Independent)
    for (const word of words) {
        if (!word) continue;
        let hash = 0;
        for (let j = 0; j < word.length; j++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(j);
            hash |= 0; // Convert to 32bit integer
        }
        const idx = Math.abs(hash) % dimensions;
        embedding[idx] += 1;
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        for (let i = 0; i < dimensions; i++) {
            embedding[i] /= magnitude;
        }
    }

    return embedding;
}

// Generate embeddings - uses Gemini if available, otherwise fallback
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
    if (LLM_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
        return getGeminiEmbeddings(texts);
    }
    // Fallback to simple embeddings for non-Gemini providers
    console.log('Using simple text embeddings (no Gemini API key)');
    return texts.map(text => simpleTextEmbedding(text));
}

async function getGeminiEmbeddings(texts: string[]): Promise<number[][]> {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });

    const embeddings: number[][] = [];
    for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
    }
    return embeddings;
}

// Single text embedding
export async function getEmbedding(text: string): Promise<number[]> {
    const embeddings = await getEmbeddings([text]);
    return embeddings[0];
}
