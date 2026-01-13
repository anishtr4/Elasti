# Elasti - Website Q&A Bot

A self-hosted Q&A bot that answers questions based on your website's content.

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 20+
- OpenAI API Key

### 2. Setup

```bash
# Clone and enter directory
cd /path/to/elasti

# Copy environment file
cp .env.example .env

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env

# Start infrastructure (OpenSearch + Redis)
docker-compose up -d opensearch redis

# Install dependencies
npm install

# Start API (development)
npm run dev
```

### 3. Create a Project & Crawl

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
    # Using Python (simplest)
    cd test-website
    python3 -m http.server 8080
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
