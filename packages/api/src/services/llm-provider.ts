import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

// LLM Provider types
type LLMProvider = 'gemini' | 'groq' | 'openai';

// Get provider from env
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'gemini') as LLMProvider;

// Initialize clients lazily
let geminiClient: GoogleGenerativeAI | null = null;
let groqClient: Groq | null = null;
let openaiClient: OpenAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
    return geminiClient;
}

function getGroqClient(): Groq {
    if (!groqClient) {
        groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    }
    return groqClient;
}

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    }
    return openaiClient;
}

// Generate text completion
export async function generateCompletion(prompt: string): Promise<string> {
    switch (LLM_PROVIDER) {
        case 'gemini':
            return generateWithGemini(prompt);
        case 'groq':
            return generateWithGroq(prompt);
        case 'openai':
            return generateWithOpenAI(prompt);
        default:
            throw new Error(`Unknown LLM provider: ${LLM_PROVIDER}`);
    }
}

async function generateWithGemini(prompt: string): Promise<string> {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || '';
}

async function generateWithGroq(prompt: string): Promise<string> {
    const client = getGroqClient();
    const response = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Fast, free-tier friendly
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
    });
    return response.choices[0]?.message?.content || '';
}

async function generateWithOpenAI(prompt: string): Promise<string> {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
    });
    return response.choices[0]?.message?.content || '';
}

// Get current provider info for debugging
export function getCurrentProvider(): { provider: string; configured: boolean } {
    let configured = false;
    switch (LLM_PROVIDER) {
        case 'gemini':
            configured = !!process.env.GEMINI_API_KEY;
            break;
        case 'groq':
            configured = !!process.env.GROQ_API_KEY;
            break;
        case 'openai':
            configured = !!process.env.OPENAI_API_KEY;
            break;
    }
    return { provider: LLM_PROVIDER, configured };
}

console.log(`🤖 LLM Provider: ${LLM_PROVIDER}`);
