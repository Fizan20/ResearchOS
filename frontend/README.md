# ResearchOS

A multi-agent AI research system that analyzes documents, debates findings, and answers questions with cited sources.

## Live Demo

Frontend: https://research-os-jade.vercel.app

## What it does

Upload up to 5 PDF documents. Four specialized AI agents run in sequence:

- **Research Agent** — extracts key findings, trends, and statistics
- **Fact Check Agent** — validates claims and assigns confidence levels
- **Contradiction Agent** — identifies conflicts and missing information
- **Executive Agent** — synthesizes a full report with risks and recommendations

After analysis, ask any question about the documents. The system runs a debate pipeline — a Research view and Critic view are weighed against each other, and a Judge Agent delivers a final verdict with a confidence score and cited sources.

Each session gets a unique ID stored in Redis, so documents persist across requests for 2 hours.

## Tech Stack

**Frontend**
- Next.js
- React

**Backend**
- Python
- FastAPI
- Groq API (Llama 3.3 70B)
- pypdf
- Upstash Redis (session storage)

**Deployment**
- Frontend + Backend: Vercel

## Local Setup

### Backend

```bash
cd backend
py -m pip install fastapi uvicorn pypdf python-dotenv groq upstash-redis cryptography python-multipart
```

Create a `.env` file in the backend folder:
GROQ_API_KEY=your_groq_api_key_here

KV_REST_API_URL=your_upstash_url

KV_REST_API_TOKEN=your_upstash_token

Start the backend:

```bash
py -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/upload-documents` | POST | Upload 1-5 PDFs and run multi-agent analysis |
| `/ask` | GET | Ask a question with debate pipeline and citations |
| `/upload-pdf` | POST | Single PDF quick analysis |
| `/test-ai` | GET | Health check |

## Agent Pipeline
Documents

↓

Research Agent → Fact Check Agent → Contradiction Agent → Executive Agent

↓

Interactive Query

↓

Research View + Critic View → Judge Verdict + Confidence Score + Citations

## Notes

- Each session lasts 2 hours — re-upload if session expires
- Maximum 5 PDFs per session
- API usage subject to Groq free tier limits (1000 requests/day)