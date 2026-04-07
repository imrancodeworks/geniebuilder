# GenieBuilder v4 — AI-Powered Interview Simulator

**GenieBuilder** is a high-performance interview prep platform featuring a pure NLP resume screening tool AND an AI-powered interview simulator. It parses resumes, ranks candidates, and facilitates adaptive mock interviews.

---

## Architecture

```
GenieBuilder/
├── backend/
│   ├── main.py                  ← FastAPI app (serves React build + API)
│   ├── auth.py                  ← JWT & OAuth2 logic
│   ├── database.py              ← MongoDB connectivity
│   ├── parsers/
│   │   └── resume_parser.py     ← PDF / DOCX / TXT text extraction
│   ├── nlp/
│   │   ├── extractor.py         ← spaCy NER + regex extraction
│   │   └── skills_db.py         ← 400+ skills taxonomy
│   └── matching/
│       └── scorer.py            ← Weighted scoring + gap analysis
├── PrepAI-v4/                   ← Modern React Application (GenieBuilder Frontend)
│   ├── src/
│   └── dist/                    ← Built frontend served by backend
├── requirements.txt
└── run.py                       ← Quick-start script
```


---

## How It Works (No AI)

| Stage | Technology | Purpose |
|-------|-----------|---------|
| File parsing | `pdfplumber`, `python-docx` | Extract raw text from PDF/DOCX/TXT |
| Entity extraction | `spaCy en_core_web_sm` | Name, companies, dates via NER |
| Pattern matching | `regex` | Email, phone, LinkedIn, GitHub |
| Skill extraction | Phrase matching vs taxonomy (400+ skills) | Detect skills in resume |
| JD parsing | Same pipeline | Extract requirements from job posting |
| Skill score (40%) | Set intersection | Required + preferred skill match % |
| Experience score (30%) | Date range arithmetic | Years extracted vs. JD requirement |
| Education score (15%) | Level hierarchy comparison | Degree level matched to requirement |
| Keyword score (15%) | TF-IDF cosine similarity | `scikit-learn` text similarity |
| Gap analysis | Rule-based | Missing skills, exp gaps, edu gaps |
| Ranking | Sort by weighted total | Descending score order |

## 🚀 Deployment (Vercel + Render Split)

This project is optimized to run as a split-stack application for maximum reliability.

### 1. Backend (Render)
- **Repo Root**: `/`
- **Build Command**: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
- **Start Command**: `gunicorn backend.main:app -k uvicorn.workers.UvicornWorker`
- **Env Vars**:
    - `MONGO_URI`: Your MongoDB Atlas string.
    - `JWT_SECRET`: Random secure hex string.
    - `ALLOWED_ORIGINS`: Your Vercel URL (e.g., `https://your-app.vercel.app`).

### 2. Frontend (Vercel)
- **Framework**: Vite
- **Root Directory**: `PrepAI-v4`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Env Var**:
    - `VITE_API_URL`: Your Render Backend URL + `/api` (e.g., `https://your-backend.onrender.com/api`).

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-resume` | Upload a resume file (multipart/form-data) |
| `POST` | `/api/job-description` | Submit job description JSON |
| `POST` | `/api/match` | Rank all loaded candidates |
| `GET` | `/api/candidates` | List all uploaded candidates |
| `GET` | `/api/candidate/{id}` | Full candidate details |
| `DELETE` | `/api/candidate/{id}` | Remove a candidate |
| `GET` | `/api/jd` | Current job description |
| `DELETE` | `/api/jd` | Clear job description |
| `DELETE` | `/api/candidates` | Clear all candidates |
| `GET` | `/api/health` | Health check |

### Example: Upload a resume

```bash
curl -X POST http://localhost:8000/api/upload-resume \
  -F "file=@/path/to/resume.pdf"
```

### Example: Load a JD

```bash
curl -X POST http://localhost:8000/api/job-description \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Python Engineer",
    "company": "Acme Corp",
    "description": "We require 5+ years of Python experience. Must have skills in FastAPI, PostgreSQL, Docker, and AWS. Bachelor'\''s degree in Computer Science preferred. Experience with microservices and CI/CD pipelines is a plus."
  }'
```

### Example: Run match

```bash
curl -X POST http://localhost:8000/api/match \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Scoring Weights

| Dimension | Weight | Method |
|-----------|--------|--------|
| Skill match | **40%** | Required skills (70%) + preferred skills (30%) |
| Experience | **30%** | Years comparison with over/under-qualification logic |
| Education | **15%** | Level hierarchy (PhD > Master > Bachelor > …) |
| Keyword fit | **15%** | TF-IDF cosine similarity |

To adjust weights, edit `WEIGHTS` in `backend/matching/scorer.py`.

---

## Supported File Formats

| Format | Parser | Notes |
|--------|--------|-------|
| `.pdf` | `pdfplumber` | Text PDFs only; scanned PDFs need OCR |
| `.docx` | `python-docx` | Full paragraph + table extraction |
| `.doc` | `python-docx` | Best-effort; use .docx for reliability |
| `.txt` | built-in | UTF-8 / Latin-1 / Windows-1252 |

---

## Adding More Skills

Edit `backend/nlp/skills_db.py` → `SKILLS_TAXONOMY`. Add to an existing category or create a new one. The extractor picks them up automatically on next restart.

---

## Production Notes

- **Storage**: Replace in-memory `dict` in `main.py` with SQLite (via `aiofiles` + `sqlite3`) or PostgreSQL (`asyncpg`).
- **File storage**: Save uploaded files to disk or S3 rather than processing in-memory only.
- **Auth**: Add API key middleware or OAuth2 before exposing publicly.
- **OCR**: For scanned PDF resumes, add `pytesseract` + `pdf2image` as a pre-processing step.
- **Scalability**: Move parsing to a Celery worker queue backed by Redis.

---

## License

MIT
