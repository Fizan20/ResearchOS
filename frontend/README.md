# ResearchOS

A multi-agent AI research system that analyzes documents, debates findings, and answers questions with cited sources.

## What it does

Upload up to 5 PDF documents. Four specialized AI agents run in sequence:

- **Research Agent** — extracts key findings, trends, and statistics
- **Fact Check Agent** — validates claims and assigns confidence levels
- **Contradiction Agent** — identifies conflicts and missing information
- **Executive Agent** — synthesizes a full report with risks and recommendations

After analysis, ask any question about the documents. The system runs a debate pipeline — a Research view and Critic view are weighed against each other, and a Judge Agent delivers a final verdict with a confidence score and cited sources.

## Tech Stack

**Frontend**
- Next.js
- React
- Tailwind CSS

**Backend**
- Python
- FastAPI
- Groq API (Llama 3.3 70B)
- pypdf

**Deployment**
- Frontend: Vercel
- Backend: Render

## Local Setup

### Backend

```bash
cd backend
py -m pip install fastapi uvicorn pypdf python-dotenv groq
```

Create a `.env` file in the backend folder:
GROQ_API_KEY=your_groq_api_key_here

Get a free API key at https://console.groq.com

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

- Documents are stored in memory per session. Re-upload after restarting the backend.
- Maximum 5 PDFs per session.
- API usage is subject to Groq free tier limits (1000 requests/day).