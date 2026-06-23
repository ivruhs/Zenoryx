# Zenoryx

> **AI-Powered GitHub Code Assistant** — Understand any codebase through semantic AST chunking and real-time LLM inference.

🌐 **Live Application:** [https://zenoryx.vercel.app](https://zenoryx.vercel.app)

---

## 📖 Table of Contents

- [Overview & Philosophy](#-overview--philosophy)
- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Environment Variables](#-environment-variables)
- [Local Development Setup](#-local-development-setup)
- [Project Structure](#-project-structure)
- [Deep Dive: The AST Ingestion Pipeline](#-deep-dive-the-ast-ingestion-pipeline)
- [REST API Reference](#-rest-api-reference)
- [Serverless Deployment Guide](#-serverless-deployment-guide)
- [Troubleshooting & Common Errors](#-troubleshooting--common-errors)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ⚡ Overview & Philosophy

Zenoryx was built to solve a critical problem in software engineering: onboarding onto massive, undocumented codebases is painful. Traditional RAG (Retrieval-Augmented Generation) applications fail at code comprehension because they blindly split text by character count, frequently severing the structural logic of functions, classes, and callbacks.

Zenoryx introduces **Semantic Chunking**. By leveraging Tree-sitter to construct an Abstract Syntax Tree (AST) of the target repository, Zenoryx slices source files based on their actual programming constructs. These high-fidelity chunks are embedded via Google's Gemini models, stored natively in a NeonDB PostgreSQL database using the `pgvector` extension, and queried using cosine similarity.

The retrieved context is fed into Groq's Llama-3-70B inference engine, establishing an active Server-Sent Events (SSE) connection to stream architectural answers back to the Next.js client with near-zero latency.

---

## 🚀 Core Features

### 🧠 Semantic AST Code Chunking

Instead of native text splitters, Zenoryx uses native C++ Tree-sitter bindings. It intelligently extracts intact `function_declaration`, `class_declaration`, and `arrow_function` nodes across JavaScript, TypeScript, Python, C++, and Java. If an unsupported language or malformed encoded file is encountered, it gracefully degrades to a defensive, hard-capped fallback character splitter.

### 🚄 Resilient Background Queues

Heavy repository ingestion is decoupled from the main API thread using BullMQ and Upstash Redis. The worker pipeline features:

- **Base64 Decoding:** Safely decodes Octokit payloads to prevent parser crashes.
- **API Timeouts:** Strict 10-second `Promise.race` timeouts on external LLM calls to prevent stall loops.
- **Idempotency:** Raw SQL checks to prevent duplicate chunk processing during retry loops.

### 🌊 Real-Time Inference Streaming (SSE)

AI responses are not batched. They stream to the Next.js client character-by-character over HTTP Server-Sent Events. The UI dynamically renders the markdown stream, applying `remark-gfm` formatting and VS Code Dark syntax highlighting to code blocks in real-time.

### 🛡️ Fail-Safe UX & "Last Resort Cleanup"

The cloud is unpredictable (e.g., OOM Kills on free tiers). Zenoryx implements a 5-minute timeout detector on the frontend. If a background worker crashes silently, the UI catches the hanging state and provides users an **"Escape Hatch"** to forcefully terminate the job and wipe the stuck project from the database.

### 🔒 Stateless Authentication

User sessions are protected using `HttpOnly`, `Secure`, `SameSite=Strict` cookies and bcrypt password hashing. Zenoryx completely avoids local storage JWT vulnerabilities.

---

## 🏗 System Architecture

The application is designed around an asynchronous, event-driven architecture.

### The Ingestion Lifecycle

1. **Request:** The user submits a GitHub `owner/repo` string.
2. **Queueing:** The Express API creates a `Project` in NeonDB (`status: PENDING`) and pushes a job to Upstash Redis.
3. **Execution:** The BullMQ worker picks up the job, updates status to `PROCESSING`, and uses `@octokit/rest` to recursively fetch the Git Tree.
4. **Parsing & Chunking:** Code files are downloaded, decoded, and parsed by Tree-sitter into discrete, semantic units of meaning.
5. **Embedding:** Each chunk is passed to Gemini 1.5 Flash to generate a 3-bullet summary and a 3072-dimensional vector.
6. **Storage:** Raw SQL queries inject the text and vector directly into the `code_chunks` table.
7. **Completion:** The worker fetches recent commit history, generates AI diff summaries, and marks the project as `READY`.

### The Query Lifecycle

1. **Prompt:** User asks a codebase question via the Chat UI.
2. **Vectorization:** The backend embeds the user's question using Gemini.
3. **Similarity Search:** A raw SQL query computes the cosine distance (`<=>`) between the prompt vector and the database vectors, retrieving the top 5 most relevant code chunks.
4. **LLM Synthesis:** The retrieved code chunks are injected into a strict system prompt and sent to Groq (Llama 3).
5. **Streaming:** Groq's response is piped back to the client via `res.write()` SSE chunks.

---

## 💻 Technology Stack

| Category           | Technology                    | Purpose                                      |
| ------------------ | ----------------------------- | -------------------------------------------- |
| Frontend Framework | Next.js 15 (App Router)       | Client UI, routing, and hydration.           |
| Styling & UI       | Tailwind CSS, Lucide React    | Utility-first styling and iconography.       |
| State Management   | Zustand, React Query          | Client-side stores and server-state caching. |
| Backend Framework  | Express.js 5                  | REST API routing and SSE streaming.          |
| Database & ORM     | NeonDB, Prisma                | Serverless PostgreSQL with pgvector.         |
| Queue & Caching    | BullMQ, Upstash Redis         | Reliable background job processing.          |
| AI (Inference)     | Groq SDK (Llama-3-70b)        | Ultra-fast text generation for Q&A.          |
| AI (Embedding)     | Google Generative AI (Gemini) | 3072-dimensional vector generation.          |
| Code Parsing       | Tree-sitter, Octokit          | AST generation and GitHub API interfacing.   |

---

## 📋 Prerequisites

Before setting up Zenoryx locally, ensure you have the following installed and configured:

- **Node.js:** v18.x or v20.x (LTS recommended)
- **npm:** v9.x or higher
- **Git:** For cloning and version control.
- **NeonDB Account:** For serverless PostgreSQL.
- **Upstash Account:** For serverless Redis.
- **Groq API Key:** For Llama 3 inference.
- **Google AI Studio Key:** For Gemini embeddings.
- **GitHub PAT:** A Personal Access Token to bypass strict API rate limits.

---

## 🔐 Environment Variables

You must configure two separate environment files to run the monorepo.

### Backend (`backend/.env`)

| Variable         | Description                        | Example                                                               |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`   | NeonDB pooled connection string.   | `postgresql://user:pass@ep-rest.neon.tech/zenoryx?sslmode=require`    |
| `REDIS_URL`      | Upstash ioredis connection string. | `rediss://default:pass@uw1-rest.upstash.io:6379`                      |
| `GROQ_API_KEY`   | Your Groq Cloud API Key.           | `gsk_12345abcdef...`                                                  |
| `GEMINI_API_KEY` | Google Generative AI Key.          | `AIzaSyB...`                                                          |
| `GITHUB_TOKEN`   | GitHub PAT for Octokit.            | `ghp_abc123...`                                                       |
| `COOKIE_SECRET`  | Secure string for signing cookies. | `your_random_secure_string_here`                                      |
| `FRONTEND_URL`   | CORS origin allowance.             | `http://localhost:3000` (Local) / `https://zenoryx.vercel.app` (Prod) |
| `BACKEND_PORT`   | Port for the Express server.       | `8000`                                                                |

### Frontend (`frontend/.env.local`)

| Variable              | Description                   | Example                                                                         |
| --------------------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL for the Express API. | `http://localhost:8000/api` (Local) / `https://zenoryx.onrender.com/api` (Prod) |

---

## 🛠 Local Development Setup

Zenoryx is structured as a Monolithic Repository (Monorepo). This enables simultaneous execution of both the frontend and backend using a single command.

### 1. Clone & Initialize

```bash
git clone https://github.com/yourusername/zenoryx.git
cd zenoryx

# Initialize root package.json for concurrent running
npm init -y
npm install concurrently
```

### 2. Install Sub-Project Dependencies

```bash
# Install Next.js dependencies
cd frontend
npm install

# Install Express and Worker dependencies
cd ../backend
npm install
```

### 3. Database Initialization

Ensure your NeonDB project is active. In the Neon SQL Editor, execute:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Navigate back to your terminal to push the Prisma schema and generate the client:

```bash
# Still in the /backend directory
npx prisma db push
npx prisma generate
```

### 4. Boot the Monorepo

Add the following script to your root `zenoryx/package.json`:

```json
"scripts": {
  "dev": "concurrently \"cd frontend && npm run dev\" \"cd backend && npm run dev\""
}
```

Return to the root `zenoryx` folder and start the application:

```bash
npm run dev
```

The Next.js frontend will be available at `http://localhost:3000` and the Express backend/worker will boot on `http://localhost:8000`.

---

## 📂 Project Structure

```
zenoryx/
├── package.json               # Root monorepo configuration
├── frontend/                  # Next.js 15 Application
│   ├── app/                   # App Router pages (Dashboard, Projects)
│   ├── components/            # UI Components (AuthGuard, Navbar)
│   ├── hooks/                 # Custom React Query and SSE Hooks
│   ├── stores/                # Zustand State Management (chatStore)
│   └── lib/                   # Axios interceptors and utilities
└── backend/                   # Express API & BullMQ Worker
    ├── src/
    │   ├── controllers/       # Route logic (Project, Auth, QA)
    │   ├── lib/               # Core utilities (Chunker, Logger, Tree-sitter)
    │   ├── prisma/            # Schema and migrations
    │   ├── queues/            # BullMQ worker initialization and job logic
    │   ├── routes/            # Express route definitions
    │   └── services/          # External integrations (Octokit, Groq, Gemini)
    ├── package.json           # Backend dependencies and "concurrently" scripts
    └── server.js              # Express application entry point
```

---

## 🔍 Deep Dive: The AST Ingestion Pipeline

The most complex and critical component of Zenoryx is the `chunker.js` file and the worker loop.

### Tree-Sitter Integration

Text splitting is fundamentally flawed for code. We utilize `tree-sitter` along with specific language grammars (`tree-sitter-javascript`, `tree-sitter-python`, etc.). The chunker recursively traverses the AST nodes.

- **Inclusion Logic:** It captures nodes of type `function_declaration`, `method_definition`, and `class_declaration`.
- **Exclusion Logic (Callbacks):** If it detects an `arrow_function`, it checks the parent node. If the parent is a `call_expression` (e.g., an inline `.map()` or `.then()` callback), it does **not** chunk it in isolation, preventing the loss of surrounding semantic context.

### Defensive Fallbacks

If the target language lacks an installed grammar, or if the file contains malformed syntax/un-decoded Base64, the chunker throws an error. We catch this error and route the file to `fallbackChunkCode()`, which splits by character count (1500 chars with a 200 char overlap).

**The Infinite Loop Protection:** To prevent the fallback chunker from slicing a massive 3MB bundled file into 5,000 chunks (which would subsequently crash the Gemini API and cause a BullMQ stall loop), we instituted a strict Hard Limit:

```js
const MAX_CHUNKS = 50;
if (chunks.length >= MAX_CHUNKS) {
  logger.warn(`Truncating fallback to ${MAX_CHUNKS} chunks to prevent infinite API loops.`);
  break;
}
```

---

## 📡 REST API Reference

### Authentication

| Method | Endpoint             | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| `POST` | `/api/auth/register` | Creates a new user and sets HttpOnly cookie. |
| `POST` | `/api/auth/login`    | Authenticates user and sets HttpOnly cookie. |
| `POST` | `/api/auth/logout`   | Clears the authentication cookie.            |
| `GET`  | `/api/auth/me`       | Returns current authenticated user data.     |

### Projects

**`POST /api/projects`**

- **Payload:** `{ repoUrl: "https://github.com/owner/repo" }`
- **Action:** Creates database record and pushes job to BullMQ.

**`GET /api/projects`**

- **Action:** Retrieves all projects owned by the authenticated user.

**`GET /api/projects/:id`**

- **Action:** Retrieves specific project metadata (status, file count).

**`DELETE /api/projects/:id`**

- **Action:** The "Escape Hatch". Removes pending jobs from BullMQ, wipes vectors via raw SQL (`DELETE FROM code_chunks`), and deletes the project.

### Q&A Streaming

**`POST /api/qa/stream`**

- **Payload:** `{ projectId: "uuid", question: "How does auth work?" }`
- **Action:** Retrieves context via cosine similarity, opens `text/event-stream`, and streams Llama 3 markdown response.

---

## ☁️ Serverless Deployment Guide

Deploying background workers typically requires expensive dedicated servers. Zenoryx employs a specific architectural strategy to deploy 100% for free across Vercel and Render.

### 1. Database (NeonDB) & Cache (Upstash)

Both services offer permanent free tiers. Ensure your NeonDB project is set to wake automatically. Copy your Upstash Redis connection string and verify it begins with `rediss://` for TLS support.

### 2. Backend API & Worker (Render)

Render charges for dedicated "Background Worker" dynos. To bypass this, we run both the Express API and the BullMQ worker inside a single Web Service.

1. Link your GitHub repository to a new Render Web Service.
2. **Root Directory:** Set this to `backend`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`

**The Hack:** Your `backend/package.json` must contain:

```json
"scripts": {
  "start": "concurrently \"node src/server.js\" \"node src/queues/worker.js\""
}
```

This command spins up both processes simultaneously within the free container.

5. Input all environment variables. Set `NODE_ENV` to `production`.

> **Note:** Render free instances spin down after 15 minutes of inactivity. The first API request after a dormant period may take up to 45 seconds to resolve while the container boots.

### 3. Frontend UI (Vercel)

Vercel is optimized for Next.js and provides instant edge deployments.

1. Link the exact same GitHub repository to a new Vercel Project.
2. **Root Directory:** Edit the configuration and set this to `frontend`.
3. **Environment Variables:** Add `NEXT_PUBLIC_API_URL` pointing to your deployed Render URL (e.g., `https://zenoryx-api.onrender.com/api`).
4. Click **Deploy**.

### 4. The CORS Handshake

Once Vercel finishes deploying, copy the production URL (`https://zenoryx.vercel.app`). Return to the Render dashboard, update the `FRONTEND_URL` environment variable with this domain, and manually restart the Web Service to apply the correct CORS policy.

---

## 🐛 Troubleshooting & Common Errors

### 1. "PROCESSING" Status Infinite Loading (Zombie Jobs)

**Symptoms:** The UI is stuck on the "Analyzing Codebase" screen indefinitely.

**Cause:** The background worker crashed (likely due to a Memory Limit OOM Kill on Render's 512MB tier) before it could execute the `catch` block to update the database to `FAILED`.

**Resolution:** Use the UI's built-in 5-minute "Escape Hatch" to cancel the process. Alternatively, manually clear it in NeonDB:

```sql
UPDATE "Project" SET status = 'FAILED' WHERE status = 'PROCESSING';
```

### 2. Tree-sitter "Invalid Argument" Crash

**Symptoms:** Worker logs show `Error: Invalid argument at Parser.parse`.

**Cause:** Octokit returned the GitHub file as a Base64 encoded JSON object, not a plain text string.

**Resolution:** Ensure `github.service.js` contains the decoding logic:

```js
if (typeof data === "object" && data.encoding === "base64") {
  return Buffer.from(data.content, "base64").toString("utf8");
}
```

### 3. API Rate Limit Hangs

**Symptoms:** Ingestion halts midway through a repository without throwing an error.

**Cause:** Gemini or Groq APIs silently dropped the connection due to excessive concurrent requests.

**Resolution:** Ensure your worker loop implements `withTimeout` bounds (10,000ms max) and a `setTimeout` breather (500ms) between chunk processing iterations.

---

## 🗺 Future Roadmap

- [ ] **Recursive Batched Ingestion:** The current V1 enforces a 25-file limit to respect cloud memory constraints. Future versions will implement recursive, paginated queueing to ingest monolithic repositories safely.
- [ ] **OAuth Private Repositories:** Integrate standard GitHub OAuth flows to request short-lived access tokens, enabling users to index private, organizational repositories securely.
- [ ] **Expanded AST Grammars:** Incorporate Rust (`tree-sitter-rust`), Go (`tree-sitter-go`), and Ruby grammars to expand support for backend engineering teams.
- [ ] **Conversational Memory Injection:** Upgrade the Groq prompt construction to retrieve and inject the past 3 query/response pairs, enabling multi-turn, context-aware conversations.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
