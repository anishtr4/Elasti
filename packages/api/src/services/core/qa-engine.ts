import { hybridSearch } from '../storage/opensearch.js';
import { getEmbedding } from '../ai/embeddings.js';
import { generateCompletion } from '../ai/llm-provider.js';

import { ProjectStore } from '../storage/project-store.js';

export interface ChatResponse {
    answer: string;
    sources: Array<{ url: string; title: string }>;
    crossReferences?: Array<{ project: string; results: Array<{ url: string; title: string }> }>;
}

export async function answerQuestion(
    projectId: string,
    question: string
): Promise<ChatResponse> {
    // 1. Get embedding for the question
    const questionEmbedding = await getEmbedding(question);

    // 2. Main Search (Isolated for Generation)
    const chunks = await hybridSearch(projectId, questionEmbedding, question, 5);

    // 3. Generate Answer (using ONLY main chunks)
    let answer = "I couldn't find any relevant information to answer your question. Please try rephrasing or ask about a different topic.";
    let sources: Array<{ url: string; title: string }> = [];

    if (chunks.length > 0) {
        // Build context from chunks
        const context = chunks
            .map((chunk, i) => `[Source ${i + 1}]: ${chunk.content}`)
            .join('\n\n');

        // Build prompt
        const prompt = `You are a helpful assistant that answers questions based on the provided context.
Always base your answers on the context provided. If the context doesn't contain enough information to answer the question, say so.
Be concise and direct. Cite sources when relevant using [Source N] format.

Context:
${context}

Question: ${question}`;

        // Generate answer using configured LLM provider
        answer = await generateCompletion(prompt);

        // Extract unique sources
        sources = chunks
            .map(chunk => ({ url: chunk.url, title: chunk.title }))
            .filter((source, index, self) =>
                index === self.findIndex(s => s.url === source.url)
            );
    }

    // 4. Cross-Reference Search (Secondary)
    const crossReferences: Array<{ project: string; results: Array<{ url: string; title: string }> }> = [];
    const project = await ProjectStore.get(projectId);

    if (project && project.crossReferenceIds && project.crossReferenceIds.length > 0) {
        console.log(`🔎 Checking ${project.crossReferenceIds.length} cross-references for project ${projectId}`);

        for (const refId of project.crossReferenceIds) {
            const refProject = await ProjectStore.get(refId);
            if (!refProject) continue;

            try {
                // Search referenced project
                // We request 3 top hits, not for generation, but for recommending links
                const allRefChunks = await hybridSearch(refId, questionEmbedding, question, 3);

                // Filter by relevance score to avoid noise
                // "Years Experience" (generic) scored ~2.5. "Landscaping" (specific) scored ~4.0.
                // Threshold 3.0 ensures only strong, specific matches are shown.
                const refChunks = allRefChunks.filter(chunk => chunk.score > 3.0);

                console.log(`🔎 Cross-reference ${refId} found ${allRefChunks.length} raw results, ${refChunks.length} relevant (>3.0)`);

                if (refChunks.length > 0) {
                    const uniqueRefSources = refChunks
                        .map(chunk => ({ url: chunk.url, title: chunk.title }))
                        .filter((source, index, self) =>
                            index === self.findIndex(s => s.url === source.url)
                        );

                    if (uniqueRefSources.length > 0) {
                        crossReferences.push({
                            project: refProject.name,
                            results: uniqueRefSources.slice(0, 1) // Limit to top 1 (best match)
                        });
                    }
                }
            } catch (error) {
                console.warn(`Failed to search cross-reference ${refId}:`, error);
            }
        }
    }

    return { answer, sources, crossReferences };
}
