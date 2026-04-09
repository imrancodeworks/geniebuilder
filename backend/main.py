"""
Resume Screening & Job Matching API
FastAPI backend — no generative AI, pure NLP + ML.
"""

import uuid
import logging
import os

# FIX 1: load_dotenv MUST be first — before any local imports that read env vars
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from passlib.context import CryptContext
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.auth import get_current_user, create_access_token, TokenData
from backend.parsers.resume_parser import parse_resume_file
from backend.nlp.extractor import extract_resume, extract_job_description
from backend.matching.scorer import rank_candidates, score_candidate
from backend.database import client, candidates_collection, jd_collection, users_collection, otp_collection

from fpdf import FPDF
from fastapi.responses import StreamingResponse
import io

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Resume Screening & Job Matching API",
    description="NLP-powered candidate ranking system backed by MongoDB.",
    version="1.1.0"
)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# FIX 2: Added allow_credentials=True — required when frontend sends JWT Authorization headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Schemas ──────────────────────────────────────────────────────────────────

class JobDescriptionRequest(BaseModel):
    title: str
    description: str
    company: Optional[str] = ""

class MatchRequest(BaseModel):
    candidate_ids: Optional[list[str]] = None
    jd_id: Optional[str] = None

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

class ForgotPassword(BaseModel):
    email: str

class VerifyOTP(BaseModel):
    email: str
    otp: str

class ResetPassword(BaseModel):
    email: str
    otp: str
    new_password: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _require_db():
    if client is None:
        raise HTTPException(503, "MongoDB is not connected. Check your MONGO_URI environment variable.")

def _build_otp_html(otp: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f1fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1fb;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(155,142,199,0.15);">
        <tr>
          <td style="background:linear-gradient(135deg,#2A1F3D 0%,#9B8EC7 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">GenieBuilder</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Password Reset</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:16px;color:#2A1F3D;margin:0 0 8px;font-weight:600;">Hi there 👋</p>
            <p style="font-size:14px;color:#5A4E6E;margin:0 0 28px;line-height:1.7;">
              We received a request to reset your GenieBuilder password.<br>
              Use the OTP below — it is valid for <strong>10 minutes</strong>.
            </p>
            <div style="background:linear-gradient(135deg,#f4f1fb,#ede8f8);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;border:2px dashed #9B8EC7;">
              <div style="font-size:11px;color:#9B8EC7;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;font-weight:600;">Your One-Time Password</div>
              <div style="font-size:44px;font-weight:800;color:#2A1F3D;letter-spacing:12px;font-family:'Courier New',monospace;">{otp}</div>
            </div>
            <p style="font-size:13px;color:#9488A8;line-height:1.7;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f7ff;padding:20px 40px;border-top:1px solid #ede8f8;text-align:center;">
            <p style="font-size:11px;color:#b0a8c8;margin:0;">GenieBuilder · AI-Powered Interview Prep</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_via_resend(target_email: str, otp: str, from_name: str) -> None:
    """Send using Resend HTTP API (recommended for Render — no SMTP port issues)."""
    import httpx
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("RESEND_API_KEY not set")

    from_email = os.getenv("RESEND_FROM_EMAIL", f"noreply@geniebuilder.app").strip()

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [target_email],
        "subject": "Your GenieBuilder Password Reset OTP",
        "html": _build_otp_html(otp),
        "text": f"Your GenieBuilder OTP is: {otp}\nIt expires in 10 minutes.\n\nIf you didn't request this, ignore this email.",
    }

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )

    if resp.status_code not in (200, 201):
        body = resp.text[:300]
        raise RuntimeError(f"Resend API error {resp.status_code}: {body}")

    logger.info(f"✅ OTP email sent to {target_email} via Resend API")


def _send_via_smtp(target_email: str, otp: str, from_name: str) -> None:
    """Send using SMTP (Gmail or any SMTP provider)."""
    import ssl as _ssl

    smtp_host     = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port_str = os.getenv("SMTP_PORT", "587")
    smtp_user     = os.getenv("SMTP_USER", "").strip()
    smtp_pass     = os.getenv("SMTP_PASS", "").strip()

    if not smtp_user or not smtp_pass:
        raise RuntimeError(
            "SMTP credentials missing. Set SMTP_USER (Gmail address) and "
            "SMTP_PASS (16-char App Password from https://myaccount.google.com/apppasswords) "
            "in Render → Environment."
        )

    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587

    html_body  = _build_otp_html(otp)
    plain_body = (
        f"Your GenieBuilder OTP is: {otp}\n"
        "It expires in 10 minutes.\n\n"
        "If you didn't request this, ignore this email."
    )

    email_msg = MIMEMultipart("alternative")
    email_msg["Subject"] = "Your GenieBuilder Password Reset OTP"
    email_msg["From"]    = f"{from_name} <{smtp_user}>"
    email_msg["To"]      = target_email
    email_msg.attach(MIMEText(plain_body, "plain"))
    email_msg.attach(MIMEText(html_body, "html"))

    sent = False

    # Attempt 1 – STARTTLS (port 587, works on most providers)
    if smtp_port != 465:
        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(email_msg)
                sent = True
                logger.info(f"✅ OTP sent to {target_email} via STARTTLS:{smtp_port}")
        except smtplib.SMTPAuthenticationError as exc:
            raise RuntimeError(
                f"Gmail login failed for '{smtp_user}'. "
                "Use a 16-char App Password (not your normal password). "
                "Generate at https://myaccount.google.com/apppasswords"
            ) from exc
        except Exception as exc:
            logger.warning(f"STARTTLS failed ({exc}), trying SSL:465…")

    # Attempt 2 – SSL (port 465, fallback)
    if not sent:
        try:
            ctx = _ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, 465, timeout=20, context=ctx) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(email_msg)
                sent = True
                logger.info(f"✅ OTP sent to {target_email} via SSL:465")
        except smtplib.SMTPAuthenticationError as exc:
            raise RuntimeError(
                f"Gmail login failed for '{smtp_user}'. "
                "Use a 16-char App Password. "
                "Generate at https://myaccount.google.com/apppasswords"
            ) from exc
        except Exception as exc:
            raise RuntimeError(
                f"SMTP failed on both port {smtp_port} and 465: {exc}. "
                "On Render free tier, try using RESEND_API_KEY instead — "
                "free at https://resend.com (3000 emails/month)."
            ) from exc


def send_otp_email(target_email: str, otp: str):
    """
    Send OTP email. Tries Resend API first (recommended for Render hosting),
    then falls back to SMTP (Gmail).

    ─── OPTION A — Resend API (recommended, avoids SMTP port blocks) ────────
    1. Sign up free at https://resend.com  (3,000 emails/month free)
    2. Add a verified domain OR use the sandbox (only sends to your own email)
    3. In Render → Environment add:
         RESEND_API_KEY   = re_xxxxxxxxxxxx
         RESEND_FROM_EMAIL = noreply@yourdomain.com   (or omit to use default)

    ─── OPTION B — Gmail SMTP ──────────────────────────────────────────────
    1. Enable 2-Step Verification on your Google account
    2. Generate an App Password: https://myaccount.google.com/apppasswords
    3. In Render → Environment add:
         SMTP_USER = your-email@gmail.com
         SMTP_PASS = xxxx xxxx xxxx xxxx   (16-char App Password, spaces optional)
    """
    from_name = os.getenv("SMTP_FROM_NAME", os.getenv("EMAIL_FROM_NAME", "GenieBuilder"))

    # ── Try Resend first (HTTP-based, works on all Render plans) ────────────
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        try:
            _send_via_resend(target_email, otp, from_name)
            return
        except RuntimeError as exc:
            logger.warning(f"Resend failed: {exc}. Falling back to SMTP…")

    # ── Fall back to SMTP ────────────────────────────────────────────────────
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASS", "").strip()
    if smtp_user and smtp_pass:
        _send_via_smtp(target_email, otp, from_name)
        return

    # ── Neither configured ───────────────────────────────────────────────────
    msg = (
        "Email is not configured on this server. "
        "Add RESEND_API_KEY (recommended) or SMTP_USER + SMTP_PASS "
        "in Render → your service → Environment. "
        "See: https://resend.com for a free API key."
    )
    logger.error(f"❌ {msg} | OTP for {target_email}: {otp}")
    raise RuntimeError(msg)

# ─── Auth Routes ──────────────────────────────────────────────────────────────

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
        "id": str(uuid.uuid4()),
    }
    users_collection.insert_one(new_user)
    return {"message": "User registered successfully.", "user_id": new_user["id"]}


@app.post("/api/login")
def login(user: UserAuth):
    """Authenticate user and return JWT token."""
    _require_db()
    db_user = users_collection.find_one({"email": user.email})
    try:
        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(401, "Invalid email or password.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(401, "Invalid email or password. If you are an old user, please reset your password.")

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
            "avatar_id": db_user.get("avatar_id", "boy1"),
        },
    }

# ─── Forgot Password Routes ───────────────────────────────────────────────────

@app.post("/api/forgot-password")
async def forgot_password(body: ForgotPassword, background_tasks: BackgroundTasks):
    """Generate OTP and send it to email."""
    _require_db()
    user = users_collection.find_one({"email": body.email})
    if not user:
        return {"message": "If this email is registered, you will receive an OTP."}

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=10)

    # FIX 3: Use top-level otp_collection — no redundant re-imports needed
    otp_collection.update_one(
        {"email": body.email},
        {"$set": {"otp": otp, "expires_at": expiry}},
        upsert=True,
    )

    # Send synchronously so SMTP errors surface to the user immediately
    try:
        send_otp_email(body.email, otp)
    except RuntimeError as exc:
        otp_collection.delete_one({"email": body.email})
        logger.error(f"OTP not delivered to {body.email}: {exc}")
        raise HTTPException(
            status_code=503,
            detail=(
                "Email service is not configured on the server. "
                "Please contact support. (Admin: set SMTP_USER and SMTP_PASS in Render environment variables)"
            ),
        )
    return {"message": "OTP sent! Check your inbox (and spam folder)."}


@app.post("/api/verify-otp")
def verify_otp(body: VerifyOTP):
    """Check if the provided OTP is valid and not expired."""
    _require_db()
    record = otp_collection.find_one({"email": body.email})
    if not record or record["otp"] != body.otp:
        raise HTTPException(400, "Invalid or expired OTP.")

    if datetime.utcnow() > record["expires_at"]:
        otp_collection.delete_one({"email": body.email})
        raise HTTPException(400, "OTP has expired.")

    return {"message": "OTP verified successfully."}


@app.post("/api/reset-password")
def reset_password(body: ResetPassword):
    """Change user password after OTP verification."""
    _require_db()
    record = otp_collection.find_one({"email": body.email})
    if not record or record["otp"] != body.otp:
        raise HTTPException(400, "Security validation failed. Please request a new OTP.")

    if datetime.utcnow() > record["expires_at"]:
        otp_collection.delete_one({"email": body.email})
        raise HTTPException(400, "OTP has expired.")

    hashed_password = pwd_context.hash(body.new_password)
    users_collection.update_one({"email": body.email}, {"$set": {"password": hashed_password}})
    otp_collection.delete_one({"email": body.email})
    return {"message": "Password updated successfully."}


@app.get("/api/test-email")
def test_email_config():
    """Diagnostic — checks email config. Visit /api/test-email in browser."""
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    smtp_user  = os.getenv("SMTP_USER", "").strip()
    smtp_pass  = os.getenv("SMTP_PASS", "").strip()
    if resend_key:
        return {"status": "configured", "method": "Resend API",
                "key_prefix": resend_key[:8] + "…",
                "from_email": os.getenv("RESEND_FROM_EMAIL", "noreply@geniebuilder.app"),
                "note": "Resend API key is set. Emails should work."}
    if smtp_user and smtp_pass:
        return {"status": "configured", "method": "SMTP",
                "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
                "smtp_user": smtp_user,
                "note": "SMTP credentials set."}
    return {"status": "not_configured",
            "recommended": "Add RESEND_API_KEY in Render → Environment. Get free key at https://resend.com",
            "alternative": "Or add SMTP_USER + SMTP_PASS (Gmail App Password from https://myaccount.google.com/apppasswords)"}


@app.post("/api/test-email-send")
async def test_email_send(request: Request):
    """Actually send a test OTP to verify config. POST {"email": "you@example.com"}"""
    body = await request.json()
    target = body.get("email", "").strip()
    if not target:
        raise HTTPException(400, "email field required")
    try:
        send_otp_email(target, "123456")
        return {"status": "sent", "to": target}
    except RuntimeError as exc:
        raise HTTPException(503, str(exc))

# ─── Profile Routes ───────────────────────────────────────────────────────────

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
        "avatar_id": user.get("avatar_id", "boy1"),
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
            "avatar_id": profile.avatar_id,
        }},
    )
    return {"message": "Profile updated successfully."}

# ─── Core API Routes ──────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    if client is None:
        return {"status": "error", "message": "MongoDB disconnected"}
    try:
        return {
            "status": "ok",
            "candidates_loaded": candidates_collection.count_documents({}),
            "jd_loaded": jd_collection.count_documents({}) > 0,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/upload-resume")
@limiter.limit("10/minute")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
):
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
    logger.info(f"Resume stored: {parsed.get('name')} ({file.filename})")

    return {
        "id": candidate_id,
        "name": parsed.get("name"),
        "email": parsed.get("email"),
        "skills_count": len(parsed.get("skills", [])),
        "experience_years": parsed.get("experience", {}).get("total_years", 0),
        "education": parsed.get("education", {}).get("highest_level", ""),
        "filename": file.filename,
        "message": "Resume parsed successfully.",
    }


@app.post("/api/job-description")
def submit_job_description(
    body: JobDescriptionRequest,
    current_user: TokenData = Depends(get_current_user),
):
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
    logger.info(f"JD stored: {body.title}")

    return {
        "title": body.title,
        "company": body.company,
        "required_skills_count": len(parsed.get("required_skills", [])),
        "preferred_skills_count": len(parsed.get("preferred_skills", [])),
        "required_skills": parsed.get("required_skills", []),
        "min_years_experience": parsed.get("min_years_experience", 0),
        "education_level": parsed.get("education_level", "not specified"),
        "message": "Job description parsed successfully.",
    }


@app.post("/api/match")
@limiter.limit("20/minute")
def match_candidates(
    request: Request,
    body: MatchRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """Rank all (or selected) candidates against the current job description."""
    _require_db()
    jd_query = {"user_id": current_user.user_id}
    if body.jd_id:
        jd_query["jd_id"] = body.jd_id

    current_jd = jd_collection.find_one(jd_query, {"_id": 0}, sort=[("_id", -1)])
    if not current_jd:
        raise HTTPException(400, "No job description found. Submit one via POST /api/job-description first.")

    candidate_query = {"user_id": current_user.user_id}
    if candidates_collection.count_documents(candidate_query) == 0:
        raise HTTPException(400, "No resumes uploaded. Upload resumes via POST /api/upload-resume first.")

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
                "gaps": r["scoring"].get("gaps", []),
            }
            for r in ranked
        ],
    }


@app.get("/api/candidates")
def list_candidates(
    skip: int = Query(0),
    limit: int = Query(50),
    current_user: TokenData = Depends(get_current_user),
):
    """List all uploaded candidates (without raw text)."""
    _require_db()
    query = {"user_id": current_user.user_id}
    total = candidates_collection.count_documents(query)
    docs = list(candidates_collection.find(query, {"_id": 0, "raw_text": 0}).skip(skip).limit(limit))
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
                "education": c.get("education", {}).get("highest_level", ""),
            }
            for c in docs
        ],
    }


@app.get("/api/candidates/export")
def export_candidates_pdf(current_user: TokenData = Depends(get_current_user)):
    """Export the ranked candidate list as a downloadable PDF report."""
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
    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, f"Candidate Ranking Report - {jd.get('title')}", ln=True, align="C")
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, f"Company: {jd.get('company')} | Total Candidates: {len(ranked)}", ln=True, align="C")
    pdf.ln(10)

    for i, r in enumerate(ranked):
        score = r["scoring"]["total_score"]
        grade = r["scoring"]["grade"]
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 8, f"#{i+1} {r.get('name')} (Score: {score}/100 - {grade})", ln=True)
        pdf.set_font("Arial", "", 10)
        pdf.cell(0, 5, f"Email: {r.get('email')} | Exp: {r.get('experience', {}).get('total_years', 0)} yrs | Edu: {r.get('education', {}).get('highest_level', '')}", ln=True)
        pdf.cell(0, 5, f"Filename: {r.get('filename')}", ln=True)
        pdf.ln(5)

    pdf_bytes = pdf.output()
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=candidate_ranking_report.pdf"},
    )


@app.get("/api/candidate/{candidate_id}")
def get_candidate(candidate_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get full details of a single candidate."""
    _require_db()
    c = candidates_collection.find_one(
        {"id": candidate_id, "user_id": current_user.user_id},
        {"_id": 0, "raw_text": 0},
    )
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
    jd = jd_collection.find_one(
        {"user_id": current_user.user_id},
        {"_id": 0, "raw_text": 0},
        sort=[("_id", -1)],
    )
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
