"""
Resume Screening & Job Matching API
FastAPI backend — no generative AI, pure NLP + ML.
"""

import uuid
import logging
import os
from passlib.context import CryptContext
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, Request, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import random
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# 1. FIXED: Added 'backend.' prefix to all local imports to prevent Render crashes
from backend.auth import get_current_user, create_access_token, TokenData
from backend.parsers.resume_parser import parse_resume_file
from backend.nlp.extractor import extract_resume, extract_job_description
from backend.matching.scorer import rank_candidates, score_candidate
from backend.database import client, candidates_collection, jd_collection, users_collection, otp_collection

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Resume Screening & Job Matching API",
    description="NLP-powered candidate ranking system backed by MongoDB.",
    version="1.1.0"
)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
print(f"DEBUG: SMTP_USER is '{os.getenv('SMTP_USER')}'")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"]
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Schemas ─────────────────────────────────────────────────────────────────

class JobDescriptionRequest(BaseModel):
    title: str
    description: str
    company: Optional[str] = ""

class MatchRequest(BaseModel):
    candidate_ids: Optional[list[str]] = None   # None = use all
    jd_id: Optional[str] = None                 # Reference to a specific JD

class UserProfile(BaseModel):
    username: Optional[str] = None
    gender: Optional[str] = "not_specified"
    avatar_id: Optional[str] = "boy1"

class UserAuth(BaseModel):
    email: str
    password: str
    username: Optional[str] = None
    gender: Optional[str] = "not_specified"
    avatar_id: Optional[str] = "boy1"

def _require_db():
    if client is None:
        raise HTTPException(503, "MongoDB is not connected. Check your backend/.env configuration.")

# ─── Auth Routes ─────────────────────────────────────────────────────────────

@app.post("/api/signup")
def signup(user: UserAuth):
    """Register a new user."""
    _require_db()
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(400, "Email already registered.")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "email": user.email,
        "password": hashed_password,
        "username": user.username,
        "gender": user.gender or "not_specified",
        "avatar_id": user.avatar_id or "boy1",
        "id": str(uuid.uuid4())
    }
    users_collection.insert_one(new_user)
    return {"message": "User registered successfully.", "user_id": new_user["id"]}

# ─── Forgot Password Routes ──────────────────────────────────────────────────

class ForgotPassword(BaseModel):
    email: str

class VerifyOTP(BaseModel):
    email: str
    otp: str

class ResetPassword(BaseModel):
    email: str
    otp: str
    new_password: str

def send_otp_email(target_email: str, otp: str):
    """Simple SMTP email sender. Configure settings in .env."""
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        logger.warning("SMTP_HOST missing in .env. Email features may fail.")
        return

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        print(f"\n[DEMO MODE] OTP for {target_email} is: {otp}\n")
        logger.warning(f"SMTP credentials missing. OTP for {target_email} was printed to terminal.")
        return

    msg = MIMEText(f"Your OTP is: {otp}. It expires in 10 minutes.")
    msg['Subject'] = 'Your Password Reset OTP'
    msg['From'] = smtp_user
    msg['To'] = target_email

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

@app.post("/api/forgot-password")
async def forgot_password(body: ForgotPassword, background_tasks: BackgroundTasks):
    """Generate OTP and send it to email."""
    _require_db()
    user = users_collection.find_one({"email": body.email})
    if not user:
        return {"message": "If this email is registered, you will receive an OTP."}

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=10)
    
    # 2. FIXED: Updated lazy import path
    from backend.database import otp_collection as local_otp_collection
    local_otp_collection.update_one(
        {"email": body.email},
        {"$set": {"otp": otp, "expires_at": expiry}},
        upsert=True
    )
    
    background_tasks.add_task(send_otp_email, body.email, otp)
    return {"message": "If this email is registered, you will receive an OTP."}

@app.post("/api/verify-otp")
def verify_otp(body: VerifyOTP):
    """Check if the provided OTP is valid and not expired."""
    _require_db()
    from backend.database import otp_collection as local_otp_collection
    record = local_otp_collection.find_one({"email": body.email})
    if not record or record["otp"] != body.otp:
        raise HTTPException(400, "Invalid or expired OTP.")
    
    if datetime.utcnow() > record["expires_at"]:
        local_otp_collection.delete_one({"email": body.email})
        raise HTTPException(400, "OTP has expired.")
    
    return {"message": "OTP verified successfully."}

@app.post("/api/reset-password")
def reset_password(body: ResetPassword):
    """Change user password after OTP verification."""
    _require_db()
    from backend.database import otp_collection as local_otp_collection
    from backend.database import users_collection as local_users_collection
    
    record = local_otp_collection.find_one({"email": body.email})
    if not record or record["otp"] != body.otp:
        raise HTTPException(400, "Security validation failed. Please request a new OTP.")
    
    if datetime.utcnow() > record["expires_at"]:
        local_otp_collection.delete_one({"email": body.email})
        raise HTTPException(400, "OTP has expired.")
    
    hashed_password = pwd_context.hash(body.new_password)
    local_users_collection.update_one({"email": body.email}, {"$set": {"password": hashed_password}})
    
    local_otp_collection.delete_one({"email": body.email})
    return {"message": "Password updated successfully."}

@app.post("/api/login")
def login(user: UserAuth):
    """Authenticate user."""
    _require_db()
    db_user = users_collection.find_one({"email": user.email})
    try:
        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(401, "Invalid email or password.")
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(401, "Invalid email or password. If you are an old user, please use Forgot Password to reset.")
    
    user_id = db_user.get("id") or str(db_user["_id"])
    
    access_token = create_access_token(data={"sub": db_user["email"], "id": user_id})
    return {
        "message": "Login successful.",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "email": db_user["email"],
            "username": db_user.get("username"),
            "gender": db_user.get("gender", "not_specified"),
            "avatar_id": db_user.get("avatar_id", "boy1")
        }
    }

# ─── Profile Routes ──────────────────────────────────────────────────────────

@app.get("/api/profile")
def get_profile(current_user: TokenData = Depends(get_current_user)):
    """Fetch user profile details."""
    _require_db()
    user = users_collection.find_one({"email": current_user.email}, {"password": 0})
    if not user:
        raise HTTPException(404, "User not found.")
    return {
        "email": user["email"],
        "username": user.get("username"),
        "gender": user.get("gender", "not_specified"),
        "avatar_id": user.get("avatar_id", "boy1")
    }

@app.put("/api/profile")
def update_profile(profile: UserProfile, current_user: TokenData = Depends(get_current_user)):
    """Update user profile details."""
    _require_db()
    users_collection.update_one(
        {"email": current_user.email},
        {"$set": {
            "username": profile.username,
            "gender": profile.gender,
            "avatar_id": profile.avatar_id
        }}
    )
    return {"message": "Profile updated successfully."}

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    if client is None:
        return {"status": "error", "message": "MongoDB disconnected"}
    try:
        return {
            "status": "ok",
            "candidates_loaded": candidates_collection.count_documents({}),
            "jd_loaded": jd_collection.count_documents({}) > 0
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/upload-resume")
@limiter.limit("10/minute")
async def upload_resume(request: Request, file: UploadFile = File(...), current_user: TokenData = Depends(get_current_user)):
    """Upload a resume file (PDF, DOCX, or TXT). Returns parsed structured data."""
    _require_db()
    if not file.filename:
        raise HTTPException(400, "No file provided.")

    MAX_SIZE = 5 * 1024 * 1024  # 5 MB
    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(413, "File too large. Maximum size is 5 MB.")

    try:
        raw_text = parse_resume_file(file.filename, content)
        parsed = extract_resume(raw_text)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    candidate_id = str(uuid.uuid4())
    parsed["id"] = candidate_id
    parsed["user_id"] = current_user.user_id
    parsed["filename"] = file.filename
    parsed["file_size_kb"] = round(len(content) / 1024, 1)

    candidates_collection.insert_one(parsed)
    logger.info(f"Parsed & stored resume: {parsed.get('name')} ({file.filename})")

    return {
        "id": candidate_id,
        "name": parsed.get("name"),
        "email": parsed.get("email"),
        "skills_count": len(parsed.get("skills", [])),
        "experience_years": parsed.get("experience", {}).get("total_years", 0),
        "education": parsed.get("education", {}).get("highest_level", ""),
        "filename": file.filename,
        "message": "Resume parsed successfully."
    }


@app.post("/api/job-description")
def submit_job_description(body: JobDescriptionRequest, current_user: TokenData = Depends(get_current_user)):
    """Parse and store a job description."""
    _require_db()

    if len(body.description.strip()) < 50:
        raise HTTPException(400, "Job description is too short (minimum 50 characters).")

    parsed = extract_job_description(body.description)
    parsed["title"] = body.title
    parsed["company"] = body.company
    parsed["jd_id"] = str(uuid.uuid4())
    parsed["user_id"] = current_user.user_id

    jd_collection.insert_one(parsed)
    return {
        "title": body.title,
        "company": body.company,
        "required_skills_count": len(parsed.get("required_skills", [])),
        "preferred_skills_count": len(parsed.get("preferred_skills", [])),
        "required_skills": parsed.get("required_skills", []),
        "min_years_experience": parsed.get("min_years_experience", 0),
        "education_level": parsed.get("education_level", "not specified"),
        "message": "Job description parsed successfully."
    }


@app.post("/api/match")
@limiter.limit("20/minute")
def match_candidates(request: Request, body: MatchRequest, current_user: TokenData = Depends(get_current_user)):
    """Rank all (or selected) candidates against the current job description."""
    _require_db()
    jd_query = {"user_id": current_user.user_id}
    if body.jd_id:
        jd_query["jd_id"] = body.jd_id

    current_jd = jd_collection.find_one(jd_query, {"_id": 0}, sort=[("_id", -1)])
    if not current_jd:
        raise HTTPException(400, "No job description found. Submit one via POST /api/job-description first.")

    candidate_query = {"user_id": current_user.user_id}
    total_candidates = candidates_collection.count_documents(candidate_query)
    if total_candidates == 0:
        raise HTTPException(400, "No resumes uploaded in DB.")

    if body.candidate_ids:
        candidate_query["id"] = {"$in": body.candidate_ids}
        docs = list(candidates_collection.find(candidate_query, {"_id": 0}))
        if not docs:
            raise HTTPException(404, "None of the specified candidate IDs were found.")
    else:
        docs = list(candidates_collection.find(candidate_query, {"_id": 0}))

    ranked = rank_candidates(docs, current_jd)

    return {
        "job_title": current_jd.get("title", ""),
        "company": current_jd.get("company", ""),
        "total_candidates": len(ranked),
        "results": [
            {
                "rank": r["rank"],
                "id": r["id"],
                "filename": r.get("filename"),
                "name": r.get("name"),
                "email": r.get("email"),
                "total_score": r["scoring"]["total_score"],
                "grade": r["scoring"]["grade"],
                "skills_score": r["scoring"]["breakdown"]["skills"]["score"],
                "experience_score": r["scoring"]["breakdown"]["experience"]["score"],
                "education_score": r["scoring"]["breakdown"]["education"]["score"],
                "keyword_score": r["scoring"]["breakdown"]["keywords"]["score"],
                "matched_skills": r["scoring"]["breakdown"]["skills"]["matched_required"],
                "missing_skills": r["scoring"]["breakdown"]["skills"]["missing_required"],
                "experience_years": r.get("experience", {}).get("total_years", 0),
                "education_level": r.get("education", {}).get("highest_level", ""),
                "gaps": r["scoring"].get("gaps", [])
            }
            for r in ranked
        ]
    }


@app.get("/api/candidates")
def list_candidates(skip: int = Query(0), limit: int = Query(50), current_user: TokenData = Depends(get_current_user)):
    """List all uploaded candidates (without raw text)."""
    _require_db()
    query = {"user_id": current_user.user_id}
    total = candidates_collection.count_documents(query)
    cursor = candidates_collection.find(query, {"_id": 0, "raw_text": 0}).skip(skip).limit(limit)
    docs = list(cursor)
    return {
        "total": total,
        "returned_count": len(docs),
        "skip": skip,
        "limit": limit,
        "candidates": [
            {
                "id": c["id"],
                "name": c.get("name"),
                "email": c.get("email"),
                "filename": c.get("filename"),
                "skills_count": len(c.get("skills", [])),
                "experience_years": c.get("experience", {}).get("total_years", 0),
                "education": c.get("education", {}).get("highest_level", "")
            }
            for c in docs
        ]
    }

from fpdf import FPDF
from fastapi.responses import StreamingResponse
import io

@app.get("/api/candidates/export")
def export_candidates_pdf(current_user: TokenData = Depends(get_current_user)):
    """Export the list of candidates as a PDF report."""
    _require_db()
    jd = jd_collection.find_one({"user_id": current_user.user_id}, {"_id": 0}, sort=[("_id", -1)])
    if not jd:
        raise HTTPException(400, "No active job description found. Cannot generate report.")
        
    docs = list(candidates_collection.find({"user_id": current_user.user_id}, {"_id": 0}))
    if not docs:
        raise HTTPException(400, "No candidates uploaded.")
        
    ranked = rank_candidates(docs, jd)
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, f"Candidate Ranking Report - {jd.get('title')}", ln=True, align='C')
    pdf.set_font("Arial", '', 12)
    pdf.cell(0, 10, f"Company: {jd.get('company')} | Total Candidates: {len(ranked)}", ln=True, align='C')
    pdf.ln(10)
    
    for i, r in enumerate(ranked):
        score = r["scoring"]["total_score"]
        grade = r["scoring"]["grade"]
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 8, f"#{i+1} {r.get('name')} (Score: {score}/100 - {grade})", ln=True)
        pdf.set_font("Arial", '', 10)
        pdf.cell(0, 5, f"Email: {r.get('email')} | Exp: {r.get('experience', {}).get('total_years', 0)} yrs | Edu: {r.get('education', {}).get('highest_level', '')}", ln=True)
        pdf.cell(0, 5, f"Filename: {r.get('filename')}", ln=True)
        pdf.ln(5)
        
    pdf_bytes = pdf.output()
    return StreamingResponse(
        io.BytesIO(pdf_bytes), 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=candidate_ranking_report.pdf"}
    )


@app.get("/api/candidate/{candidate_id}")
def get_candidate(candidate_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get full details of a single candidate."""
    _require_db()
    c = candidates_collection.find_one({"id": candidate_id, "user_id": current_user.user_id}, {"_id": 0, "raw_text": 0})
    if not c:
        raise HTTPException(404, "Candidate not found.")
    return c


@app.delete("/api/candidate/{candidate_id}")
def delete_candidate(candidate_id: str, current_user: TokenData = Depends(get_current_user)):
    """Remove a candidate from the store."""
    _require_db()
    res = candidates_collection.delete_one({"id": candidate_id, "user_id": current_user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Candidate not found.")
    return {"message": "Candidate removed."}


@app.get("/api/jd")
def get_current_jd(current_user: TokenData = Depends(get_current_user)):
    """Get the currently loaded (latest) job description."""
    _require_db()
    jd = jd_collection.find_one({"user_id": current_user.user_id}, {"_id": 0, "raw_text": 0}, sort=[("_id", -1)])
    if not jd:
        raise HTTPException(404, "No job description loaded.")
    return jd


@app.get("/api/jds")
def list_jds(current_user: TokenData = Depends(get_current_user)):
    """Get all saved job descriptions for the user."""
    _require_db()
    docs = list(jd_collection.find({"user_id": current_user.user_id}, {"_id": 0, "raw_text": 0}).sort("_id", -1))
    return {"total": len(docs), "jds": docs}


@app.delete("/api/jd")
def clear_jd(current_user: TokenData = Depends(get_current_user)):
    """Clear all job descriptions for current user."""
    _require_db()
    jd_collection.delete_many({"user_id": current_user.user_id})
    return {"message": "Job descriptions cleared."}


@app.delete("/api/candidates")
def clear_all_candidates(current_user: TokenData = Depends(get_current_user)):
    """Clear all uploaded candidates for current user."""
    _require_db()
    res = candidates_collection.delete_many({"user_id": current_user.user_id})
    return {"message": f"Removed {res.deleted_count} candidate(s)."}