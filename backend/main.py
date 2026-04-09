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

# ── CORS ─────────────────────────────────────────────────────────────────────
# allow_credentials=True requires EXACT origins (not "*").
# We always add the wildcard fallback list so local dev + Vercel both work.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()

if _raw_origins and _raw_origins != "*":
    # Specific origins provided — strip whitespace around each
    ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]
else:
    # No specific origins set — allow everything (open API)
    ALLOWED_ORIGINS = ["*"]

# "allow_credentials + wildcard" is illegal → use allow_origin_regex instead
if ALLOWED_ORIGINS == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",   # matches all origins, compatible with credentials
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

logger.info(f"CORS origins: {ALLOWED_ORIGINS}")

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

    from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev").strip()

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
        timeout=10,
    )

    if resp.status_code not in (200, 201):
        body = resp.text[:400]
        if resp.status_code == 403:
            raise RuntimeError(
                f"Resend API key is invalid or domain not verified. "
                f"Check your RESEND_API_KEY in Render → Environment. "
                f"If using a custom domain in RESEND_FROM_EMAIL, verify it at resend.com/domains first. "
                f"Or leave RESEND_FROM_EMAIL blank to use the safe sandbox address. Raw: {body}"
            )
        raise RuntimeError(f"Resend API error {resp.status_code}: {body}")

    logger.info(f"✅ OTP email sent to {target_email} via Resend API")


def _send_via_smtp(target_email: str, otp: str, from_name: str) -> None:
    """Send OTP via Gmail SMTP with App Password."""
    import ssl as _ssl

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASS", "").strip().replace(" ", "")  # strip spaces from App Password

    if not smtp_user or not smtp_pass:
        raise RuntimeError(
            "SMTP not configured. Set SMTP_USER (Gmail) + SMTP_PASS (16-char App Password) "
            "in Render → Environment."
        )

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

    last_error = None

    # Attempt 1 — STARTTLS on port 587 (Gmail primary)
    try:
        logger.info(f"Trying SMTP STARTTLS {smtp_host}:587 …")
        with smtplib.SMTP(smtp_host, 587, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, target_email, email_msg.as_string())
            logger.info(f"✅ OTP sent to {target_email} via STARTTLS:587")
            return
    except smtplib.SMTPAuthenticationError:
        raise RuntimeError(
            f"Gmail login failed for '{smtp_user}'. "
            "You must use a 16-character App Password, NOT your Gmail login password. "
            "Steps: 1) Enable 2-Step Verification on Google account  "
            "2) Go to https://myaccount.google.com/apppasswords  "
            "3) Create App Password → copy the 16 chars → paste into SMTP_PASS in Render"
        )
    except Exception as exc:
        last_error = exc
        logger.warning(f"STARTTLS:587 failed: {exc} — trying SSL:465…")

    # Attempt 2 — SSL on port 465 (fallback)
    try:
        logger.info(f"Trying SMTP SSL {smtp_host}:465 …")
        ctx = _ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, 465, timeout=12, context=ctx) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, target_email, email_msg.as_string())
            logger.info(f"✅ OTP sent to {target_email} via SSL:465")
            return
    except smtplib.SMTPAuthenticationError:
        raise RuntimeError(
            f"Gmail login failed for '{smtp_user}'. "
            "Use a 16-char App Password from https://myaccount.google.com/apppasswords"
        )
    except Exception as exc:
        raise RuntimeError(
            f"SMTP failed on both 587 and 465. Last error: {exc}. "
            f"First error: {last_error}. "
            "Check SMTP_HOST, SMTP_USER and SMTP_PASS in Render Environment."
        ) from exc


def send_otp_email(target_email: str, otp: str):
    """
    Send OTP — tries SMTP first (Gmail), then Resend API as fallback.

    IMPORTANT: onboarding@resend.dev is Resend sandbox — only delivers to
    your own Resend account email, NOT to real users. Always use SMTP or
    a verified Resend domain for production.

    Gmail SMTP setup (Render allows all outbound ports):
      1. Enable 2-Step Verification on your Google account
      2. Go to https://myaccount.google.com/apppasswords
      3. Create an App Password for "Mail"
      4. In Render → Environment add:
           SMTP_USER = your-gmail@gmail.com
           SMTP_PASS = xxxx xxxx xxxx xxxx   (16-char, spaces ok)
    """
    from_name = os.getenv("SMTP_FROM_NAME", os.getenv("EMAIL_FROM_NAME", "GenieBuilder"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASS", "").strip()
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    resend_from = os.getenv("RESEND_FROM_EMAIL", "").strip()

    # ── SMTP first — works with Gmail App Password on Render ────────────────
    if smtp_user and smtp_pass:
        logger.info(f"Attempting SMTP send to {target_email} via {smtp_user}")
        try:
            _send_via_smtp(target_email, otp, from_name)
            return
        except RuntimeError as exc:
            logger.warning(f"SMTP failed: {exc}")
            # fall through to Resend

    # ── Resend — only useful if you have a verified domain (NOT sandbox) ────
    # onboarding@resend.dev only delivers to your Resend account email!
    if resend_key:
        is_sandbox = (not resend_from) or resend_from == "onboarding@resend.dev"
        if is_sandbox:
            logger.error(
                "Resend is set to sandbox mode (onboarding@resend.dev). "
                "This ONLY delivers to your Resend account email, NOT to users. "
                "Configure SMTP_USER + SMTP_PASS (Gmail App Password) instead."
            )
            raise RuntimeError(
                "Email not configured correctly. "
                "Please contact the site admin. "
                "(Admin: set SMTP_USER and SMTP_PASS in Render → Environment. "
                "Use a Gmail App Password from https://myaccount.google.com/apppasswords)"
            )
        # Has a verified custom domain — Resend will work for all users
        try:
            _send_via_resend(target_email, otp, from_name)
            return
        except RuntimeError as exc:
            raise  # surface the real error

    # ── Nothing configured ───────────────────────────────────────────────────
    msg = (
        "Email delivery is not configured. "
        "Admin: add SMTP_USER (Gmail) + SMTP_PASS (App Password) "
        "in Render → your service → Environment. "
        "Generate App Password at https://myaccount.google.com/apppasswords"
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
def forgot_password(body: ForgotPassword):
    """
    Generate OTP, store it in DB, and return it to the frontend.
    The frontend is responsible for emailing the OTP to the user (via EmailJS).
    This approach avoids all SMTP/firewall issues on the server.
    """
    _require_db()
    user = users_collection.find_one({"email": body.email})
    if not user:
        # Always return 200 with a fake OTP-like response to prevent email enumeration
        return {"message": "OTP ready.", "otp": None, "email_found": False}

    otp = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=10)

    otp_collection.update_one(
        {"email": body.email},
        {"$set": {"otp": otp, "expires_at": expiry}},
        upsert=True,
    )

    logger.info(f"OTP generated for {body.email}: {otp}")
    return {
        "message": "OTP generated successfully.",
        "otp": otp,
        "email_found": True,
        "expires_in_minutes": 10,
    }


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


@app.get("/api/check-email")
def check_email_config():
    """
    Visit yourapp.onrender.com/api/check-email in browser to diagnose email setup.
    Shows exactly what is configured and whether it will work.
    """
    smtp_user  = os.getenv("SMTP_USER", "").strip()
    smtp_pass  = os.getenv("SMTP_PASS", "").strip()
    smtp_host  = os.getenv("SMTP_HOST", "smtp.gmail.com")
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    resend_from = os.getenv("RESEND_FROM_EMAIL", "").strip()

    issues = []
    working_method = None

    if smtp_user and smtp_pass:
        clean_pass = smtp_pass.replace(" ", "")
        if len(clean_pass) != 16:
            issues.append(
                f"SMTP_PASS is {len(clean_pass)} chars (should be exactly 16). "
                "Make sure you copied the full Gmail App Password."
            )
        else:
            working_method = "SMTP"
    else:
        issues.append("SMTP_USER or SMTP_PASS is missing.")

    if resend_key:
        if not resend_from or resend_from == "onboarding@resend.dev":
            issues.append(
                "RESEND_FROM_EMAIL is 'onboarding@resend.dev' — this is Resend SANDBOX. "
                "It ONLY delivers to your Resend account email, NOT to real users. "
                "To fix: verify your domain at resend.com/domains and set RESEND_FROM_EMAIL "
                "to noreply@yourdomain.com"
            )
        else:
            working_method = "Resend API"

    return {
        "smtp_configured": bool(smtp_user and smtp_pass),
        "smtp_user": smtp_user or "NOT SET",
        "smtp_host": smtp_host,
        "smtp_pass_length": len(smtp_pass.replace(" ", "")) if smtp_pass else 0,
        "smtp_pass_ok": len(smtp_pass.replace(" ", "")) == 16 if smtp_pass else False,
        "resend_configured": bool(resend_key),
        "resend_from": resend_from or "NOT SET (defaults to onboarding@resend.dev sandbox)",
        "resend_is_sandbox": (not resend_from) or resend_from == "onboarding@resend.dev",
        "working_method": working_method,
        "issues": issues,
        "will_emails_reach_users": working_method is not None and len([i for i in issues if "SMTP_PASS" in i or "sandbox" in i.lower()]) == 0,
        "fix_steps": (
            "1. Go to https://myaccount.google.com/apppasswords "
            "2. Sign in → Select app: Mail → Select device: Other → name it 'Render' "
            "3. Copy the 16-character password shown "
            "4. In Render → Environment: set SMTP_PASS = that 16-char password (no spaces needed) "
            "5. Redeploy"
        ) if not working_method else "Email is configured correctly!"
    }


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
