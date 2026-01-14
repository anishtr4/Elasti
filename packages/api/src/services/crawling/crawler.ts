import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { indexChunks, ChunkDocument, deleteProjectChunks } from '../storage/opensearch.js';
import { getEmbeddings } from '../ai/embeddings.js';

export interface CrawlResult {
    pagesProcessed: number;
    chunksCreated: number;
    errors: string[];
}

export interface PageData {
    url: string;
    title: string;
    content: string;
}

// Chunk text into smaller pieces
function chunkText(text: string, maxLength: number = 1000): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
        }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// Extract main content from HTML
function extractContent(html: string): { title: string; content: string } {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu, .advertisement, .ad').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

    // Get main content
    const mainContent = $('main, article, .content, .main, #content, #main').first();
    const content = (mainContent.length ? mainContent : $('body'))
        .text()
        .replace(/\s+/g, ' ')
        .trim();

    return { title, content };
}

// Discover links on a page
function discoverLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: Set<string> = new Set();
    const base = new URL(baseUrl);

    $('a[href]').each((_, el) => {
        try {
            const href = $(el).attr('href');
            if (!href) return;

            const url = new URL(href, baseUrl);

            // Only include same-domain links
            if (url.hostname === base.hostname &&
                !url.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico)$/i)) {
                links.add(url.origin + url.pathname);
            }
        } catch {
            // Ignore invalid URLs
        }
    });

    return Array.from(links);
}

export async function crawlWebsite(
    projectId: string,
    startUrl: string,
    maxPages: number = 50
): Promise<CrawlResult> {
    const result: CrawlResult = {
        pagesProcessed: 0,
        chunksCreated: 0,
        errors: [],
    };

    // Delete existing chunks for this project
    await deleteProjectChunks(projectId);

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('ElastiBot/1.0 (Website Q&A Bot)');

        const visited = new Set<string>();
        const toVisit = [startUrl];
        const allChunks: ChunkDocument[] = [];

        while (toVisit.length > 0 && visited.size < maxPages) {
            const url = toVisit.shift()!;

            if (visited.has(url)) continue;
            visited.add(url);

            try {
                console.log(`Crawling: ${url}`);

                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
                const html = await page.content();

                // Extract content
                const { title, content } = extractContent(html);

                if (content.length < 100) {
                    continue; // Skip pages with little content
                }

                // Discover new links
                const newLinks = discoverLinks(html, url);
                for (const link of newLinks) {
                    if (!visited.has(link) && !toVisit.includes(link)) {
                        toVisit.push(link);
                    }
                }

                // Chunk the content
                const textChunks = chunkText(content);

                for (const chunk of textChunks) {
                    allChunks.push({
                        project_id: projectId,
                        url,
                        title,
                        content: chunk,
                        embedding: [], // Will be filled later
                        crawled_at: new Date().toISOString(),
                    });
                }

                result.pagesProcessed++;

            } catch (error) {
                result.errors.push(`Failed to crawl ${url}: ${(error as Error).message}`);
            }
        }

        // Generate embeddings in batches
        const batchSize = 20;
        for (let i = 0; i < allChunks.length; i += batchSize) {
            const batch = allChunks.slice(i, i + batchSize);
            const texts = batch.map(c => c.content);
            const embeddings = await getEmbeddings(texts);

            for (let j = 0; j < batch.length; j++) {
                batch[j].embedding = embeddings[j];
            }

            // Index batch
            await indexChunks(batch);
            result.chunksCreated += batch.length;
        }

    } finally {
        await browser.close();
    }

    return result;
}
