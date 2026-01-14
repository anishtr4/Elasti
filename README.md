# Elasti - Website Q&A Bot

A self-hosted Q&A bot that answers questions based on your website's content.

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 20+
- OpenAI API Key

### 2. Setup

```bash
# Clone repository (if not already done)
cd /path/to/elasti

# One-command setup (installs deps + starts infrastructure)
npm run setup

# Add your API keys to .env
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY or OPENAI_API_KEY
```

### 3. Start Development

```bash
# Terminal 1: Start API (includes worker + scheduler)
npm run dev

# Terminal 2 (optional): Start Dashboard
npm run dev:dashboard

# Terminal 3 (optional): Start test website
npm run test:website
# Opens at http://localhost:8080
```

### 4. Create a Project & Crawl

```bash
# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Website", "url": "https://example.com"}'

# Start crawling (replace PROJECT_ID)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"projectId": "PROJECT_ID", "url": "https://example.com", "maxPages": 50}'

# Check crawl status
curl http://localhost:3000/api/crawl/status/JOB_ID
```

### 4. Embed Widget

Add to any website:

```html
<script 
  src="http://localhost:3000/widget.js"
  data-project-id="YOUR_PROJECT_ID"
  data-api-url="http://localhost:3000"
  data-theme="light">
</script>
```

### 5. Testing with Local Website

The repository includes a static website in `test-website/` to verify the bot functionality.

1.  **Serve the Website**:
    ```bash
    npm run test:website
    ```
    The site will be available at `http://localhost:8080`.

2.  **Create Project & Crawl**:
    Since the crawler runs in Docker, it cannot access `localhost` of your host machine directly. Use `host.docker.internal` (Mac/Windows) or your local network IP (Linux).
    
    ```bash
    # 1. Create Project
    curl -X POST http://localhost:3000/api/projects \
      -H "Content-Type: application/json" \
      -d '{"name": "Local Test", "url": "http://host.docker.internal:8080"}'
      
    # 2. Get the Project ID from the response (e.g., "123-abc")
    
    # 3. Start Crawl
    curl -X POST http://localhost:3000/api/crawl \
      -H "Content-Type: application/json" \
      -d '{"projectId": "YOUR_PROJECT_ID", "url": "http://host.docker.internal:8080"}'
    ```

3.  **Update Widget**:
    Edit `test-website/index.html` and update the `data-project-id` with your new Project ID. Refresh the page to see the widget.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| POST | `/api/crawl` | Start crawl job |
| GET | `/api/crawl/status/:id` | Job status |
| POST | `/api/chat` | Ask question |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Widget    │────▶│   Node.js    │────▶│  OpenSearch │
│  (Browser)  │     │     API      │     │   (Search)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │  Redis   │  │  OpenAI  │
              │ (Queue)  │  │  (LLM)   │
              └──────────┘  └──────────┘
```

## License

MIT
