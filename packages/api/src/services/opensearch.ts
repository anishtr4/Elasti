import { Client } from '@opensearch-project/opensearch';

const OPENSEARCH_URL = process.env.OPENSEARCH_URL || 'http://localhost:9200';
const INDEX_NAME = 'elasti-chunks';

let client: Client;

export function getClient(): Client {
    if (!client) {
        client = new Client({
            node: OPENSEARCH_URL,
        });
    }
    return client;
}

export async function initializeOpenSearch(): Promise<void> {
    const client = getClient();

    // Check connection
    await client.cluster.health({});

    // Create index if not exists
    const indexExists = await client.indices.exists({ index: INDEX_NAME });

    if (!indexExists.body) {
        await client.indices.create({
            index: INDEX_NAME,
            body: {
                settings: {
                    'index.knn': true,
                    'number_of_shards': 1,
                    'number_of_replicas': 0,
                },
                mappings: {
                    properties: {
                        project_id: { type: 'keyword' },
                        url: { type: 'keyword' },
                        title: { type: 'text', analyzer: 'standard' },
                        content: { type: 'text', analyzer: 'standard' },
                        embedding: {
                            type: 'knn_vector',
                            dimension: 768,
                            method: {
                                name: 'hnsw',
                                space_type: 'cosinesimil',
                                engine: 'nmslib',
                            },
                        },
                        crawled_at: { type: 'date' },
                    },
                },
            },
        });
        console.log(`✅ Created index: ${INDEX_NAME}`);
    }
}

export interface ChunkDocument {
    project_id: string;
    url: string;
    title: string;
    content: string;
    embedding: number[];
    crawled_at: string;
}

export async function indexChunk(chunk: ChunkDocument): Promise<void> {
    const client = getClient();
    await client.index({
        index: INDEX_NAME,
        body: chunk,
        refresh: true,
    });
}

export async function indexChunks(chunks: ChunkDocument[]): Promise<void> {
    const client = getClient();

    const body = chunks.flatMap(chunk => [
        { index: { _index: INDEX_NAME } },
        chunk,
    ]);

    await client.bulk({ body, refresh: true });
}

export async function hybridSearch(
    projectId: string,
    queryEmbedding: number[],
    queryText: string,
    limit: number = 5
): Promise<Array<{ content: string; url: string; title: string; score: number }>> {
    const client = getClient();

    const response = await client.search({
        index: INDEX_NAME,
        body: {
            size: limit,
            query: {
                bool: {
                    must: [
                        { term: { project_id: projectId } },
                    ],
                    should: [
                        {
                            match: {
                                content: {
                                    query: queryText,
                                    boost: 0.3,
                                },
                            },
                        },
                        {
                            knn: {
                                embedding: {
                                    vector: queryEmbedding,
                                    k: limit,
                                },
                            },
                        },
                    ],
                },
            },
        },
    });

    return response.body.hits.hits.map((hit: any) => ({
        content: hit._source.content,
        url: hit._source.url,
        title: hit._source.title,
        score: hit._score,
    }));
}

export async function deleteProjectChunks(projectId: string): Promise<void> {
    const client = getClient();
    await client.deleteByQuery({
        index: INDEX_NAME,
        body: {
            query: {
                term: { project_id: projectId },
            },
        },
        refresh: true,
    });
}
