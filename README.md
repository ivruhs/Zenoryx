# ⚡ Zenoryx – AI-Powered GITHUB Code Assistant

🚀 **Live at:** [https://zenoryx.vercel.app](https://zenoryx.vercel.app)

Zenoryx is an intelligent, AI-powered code assistant that helps developers analyze GitHub repositories, track commit-level changes, and manage project documentation — all in one sleek, fast interface.

> ✨ Built with **Next.js App Router**, **tRPC**, **Prisma**, **Clerk**, and **LLM APIs** (Gemini, OpenAI, etc.)

---

## 🧠 Features

### 🔍 GitHub Repo Intelligence

- Connect public or private GitHub repositories via URL
- Extract and summarize all code files using AI
- Generate vector embeddings for each file using local or cloud-based models
- Store summaries and embeddings in PostgreSQL with pgvector

### 🧾 Commit History Summarization

- Automatically fetch commits for each repo
- Summarize diffs using LLMs (e.g., Gemini, GPT)
- See commit messages, dates, authors, and AI-generated insights in one view

### 🧪 AI Q&A

- Ask questions about your codebase or commits
- Get context-aware answers with file references
- Thanks to Vector Embeddings and LLM!

### 👥 Team-Based Project Management

- Each user can manage multiple projects
- Teams and collaborators supported (via `userToProject` table)
- Credits system in place to limit overuse (per user)

---

## 🧰 Tech Stack

| Layer      | Tech Used                                |
| ---------- | ---------------------------------------- |
| Frontend   | Next.js 14 (App Router), Tailwind CSS    |
| Backend    | tRPC, React Query, Prisma ORM            |
| Auth       | Clerk (JWT + session-based)              |
| AI/ML      | Gemini, Groq, OpenRouter                 |
| Vector DB  | PostgreSQL + `pgvector`, NeonDB          |
| Hosting    | Vercel (frontend + API routes)           |
| Storage    | Prisma schema with Postgres (via NeonDB) |
| State Mgmt | React Query + `useLocalStorage`          |

---

## 📦 Project Structure

```
├── prisma/                 # Prisma schema and migration files
│   └── schema.prisma
├── public/                 # Static assets
├── src/
│   ├── app/                # App Router pages (Next.js 14)
│   │   ├── api/            # API routes (e.g., auth, sync-user)
│   │   ├── sign-in/        # Sign-in page
│   │   ├── sign-up/        # Sign-up page
│   │   ├── sync-user/      # Sync Local DB alsongside Clerk
│   │   ├── banner.tsx      # Static landing page banner
│   │   ├── layout.tsx      # App-wide layout
│   │   ├── page.tsx        # App landing/homepage
│   │   ├── _components/    # Shared layout components
│   │   └── (protected)/    # Auth-protected routes
│   │       ├── billing/
│   │       ├── create/
│   │       ├── dashboard/
│   │       ├── join/
│   │       ├── meetings/
│   │       ├── qa/
│   │       ├── layout.tsx
│   │       └── app-sidebar.tsx
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities: GitHub loaders, summarizers, etc.
│   ├── server/             # Backend logic
│   ├── styles/             # Tailwind and global styles
│   ├── trpc/               # React-side tRPC client setup
│   └── env.js              # Environment variable loader
|   |__middleware.ts        #Clerk Middleware
├── .env                    # Main environment file
├── .env.example            # Sample environment variables
├── .gitignore              # Git ignored files
├── bun.lock                # Bun dependency lock file
├── components.json         # UI config for shadcn/ui
├── eslint.config.js        # ESLint config
├── next-env.d.ts           # Next.js types
├── next.config.js          # Next.js config
├── package.json            # Project metadata and scripts
├── postcss.config.js       # Tailwind/PostCSS config
├── prettier.config.js      # Code formatter config
├── start-database.sh       # Local DB boot script
├── tsconfig.json           # TypeScript config
└── README.md               # Project overview
```

---

## 🚦 Environment Variables

Create a `.env` file at the root:

```env
DATABASE_URL=postgresql://neondb...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL='/sync-user'
GROQ_API_KEY=...
GEMINI_API_KEY=...            # For Gemini Embedding Model
OPENROUTER_API_KEY=...
```

---

## 🔧 Installation & Dev Setup

```bash
git clone https://github.com/ivruhs/zenoryx.git
cd zenoryx
pnpm install

# Setup Prisma
pnpm prisma generate
pnpm prisma db push

# Run dev server
pnpm dev
```

---

## ⚙️ CLI Commands

```bash
pnpm prisma db push            # Sync DB schema
pnpm prisma studio             # Browse data
pnpm dev                       # Run app locally
pnpm lint                      # Run linter
```

---

## 🔐 Auth & Access Control

- Users are authenticated via Clerk
- Each project is scoped to the logged-in user
- Projects have many-to-many `userToProject` relation
- Middleware ensures only authorized access

---

## 🙌 Credits

Built with ❤️ using:

- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [Clerk.dev](https://clerk.dev/)
- [NeonDB](https://neon.com/)
- [Gemini API](https://ai.google.dev/)
- [Prisma](https://prisma.io/)
- [OpenRouter] (https://openrouter.ai/)
- [Groq] (https://groq.com/)

---

## 🌐 Live Demo

👉 **[https://zenoryx.vercel.app](https://zenoryx.vercel.app)**

Check out the live version and try uploading your GitHub repo to see commit insights powered by AI!
