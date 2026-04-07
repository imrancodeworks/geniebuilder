"""
NLP Extractor Module
Extracts structured information from raw resume text using spaCy NER and regex patterns.
No generative AI used — pure rule-based and statistical NLP.
"""

import re
import logging
from datetime import datetime
from typing import Optional
from .skills_db import ALL_SKILLS, EDUCATION_LEVELS, EDUCATION_FIELDS, normalize_skill

logger = logging.getLogger(__name__)

# ─── Regex Patterns ──────────────────────────────────────────────────────────

EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'
)
PHONE_PATTERN = re.compile(
    r'(?:\+?1[-.\s]?)?'
    r'(?:\(?[2-9][0-9]{2}\)?[-.\s]?)'
    r'[2-9][0-9]{2}[-.\s]?[0-9]{4}'
)
LINKEDIN_PATTERN = re.compile(
    r'(?:linkedin\.com/in/|linkedin\.com/pub/)([A-Za-z0-9\-_%]+)'
)
GITHUB_PATTERN = re.compile(
    r'github\.com/([A-Za-z0-9\-_]+)'
)
URL_PATTERN = re.compile(
    r'https?://[^\s<>"{}|\\^`\[\]]+'
)

# Date patterns for experience calculation
DATE_RANGE_PATTERN = re.compile(
    r'((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|'
    r'Dec(?:ember)?)[,\s]+\d{4})'
    r'\s*(?:–|-|to|—)\s*'
    r'((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|'
    r'Dec(?:ember)?)[,\s]+\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow)',
    re.IGNORECASE
)
YEAR_RANGE_PATTERN = re.compile(
    r'(\d{4})\s*(?:–|-|to|—)\s*(\d{4}|[Pp]resent|[Cc]urrent)'
)
EXPERIENCE_YEARS_PATTERN = re.compile(
    r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)',
    re.IGNORECASE
)

# Section headers
SECTION_HEADERS = {
    "experience": [
        "experience", "work experience", "employment history", "professional experience",
        "work history", "career history", "positions held", "professional background"
    ],
    "education": [
        "education", "academic background", "qualifications", "academic qualifications",
        "educational background", "degrees", "academic history"
    ],
    "skills": [
        "skills", "technical skills", "core competencies", "key skills",
        "technologies", "tech stack", "tools & technologies", "expertise",
        "competencies", "proficiencies"
    ],
    "summary": [
        "summary", "profile", "objective", "professional summary", "career objective",
        "about me", "overview", "professional profile", "executive summary"
    ],
    "projects": [
        "projects", "personal projects", "key projects", "notable projects",
        "portfolio", "project experience"
    ],
    "certifications": [
        "certifications", "certificates", "credentials", "licenses",
        "professional certifications", "awards & certifications"
    ]
}

# Build reverse lookup
HEADER_TO_SECTION = {}
for section, headers in SECTION_HEADERS.items():
    for h in headers:
        HEADER_TO_SECTION[h.lower()] = section


# ─── spaCy Loader ─────────────────────────────────────────────────────────────

_nlp = None

def get_nlp():
    """Lazy-load spaCy model."""
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded: en_core_web_sm")
        except Exception as e:
            logger.warning(f"spaCy model not available: {e}. Falling back to regex only.")
            _nlp = False  # Mark as unavailable
    return _nlp if _nlp else None


# ─── Core Extraction Functions ─────────────────────────────────────────────────

def extract_email(text: str) -> Optional[str]:
    matches = EMAIL_PATTERN.findall(text)
    return matches[0] if matches else None


def extract_phone(text: str) -> Optional[str]:
    matches = PHONE_PATTERN.findall(text)
    return matches[0] if matches else None


def extract_linkedin(text: str) -> Optional[str]:
    matches = LINKEDIN_PATTERN.findall(text)
    return f"linkedin.com/in/{matches[0]}" if matches else None


def extract_github(text: str) -> Optional[str]:
    matches = GITHUB_PATTERN.findall(text)
    return f"github.com/{matches[0]}" if matches else None


def extract_name(text: str, nlp=None) -> Optional[str]:
    """
    Extract candidate name using spaCy PERSON entity on the first 500 chars,
    with a fallback to the first capitalized line.
    """
    first_block = text[:500]

    if nlp:
        doc = nlp(first_block)
        for ent in doc.ents:
            if ent.label_ == "PERSON" and len(ent.text.split()) >= 2:
                return ent.text.strip()

    # Fallback: first non-empty line that looks like a name
    for line in text.split('\n')[:10]:
        line = line.strip()
        if (
            line
            and len(line.split()) in (2, 3)
            and all(w[0].isupper() for w in line.split() if w)
            and not any(c in line for c in ['@', '.com', '/', '|', '-'])
            and len(line) < 60
        ):
            return line
    return None


def extract_skills(text: str) -> list[str]:
    """
    Match skills from the taxonomy against resume text using whole-word search.
    Returns a deduplicated, sorted list of matched skills.
    """
    text_lower = text.lower()
    found = set()

    for skill in ALL_SKILLS:
        # Use word boundary matching where possible
        pattern = re.compile(r'(?<![a-z])' + re.escape(skill) + r'(?![a-z])', re.IGNORECASE)
        if pattern.search(text_lower):
            found.add(normalize_skill(skill))

    return sorted(found)


def extract_education(text: str) -> dict:
    """
    Extract highest education level, field of study, and institutions.
    """
    text_lower = text.lower()
    highest_level = 0
    highest_label = ""
    field = ""
    institutions = []

    # Detect education level
    for keyword, level in EDUCATION_LEVELS.items():
        if keyword in text_lower and level > highest_level:
            highest_level = level
            highest_label = keyword

    # Detect field of study
    for f in EDUCATION_FIELDS:
        if f in text_lower:
            field = f
            break

    # Use spaCy to find ORG entities near education keywords
    nlp = get_nlp()
    if nlp:
        edu_section = extract_section(text, "education")
        if edu_section:
            doc = nlp(edu_section[:2000])
            for ent in doc.ents:
                if ent.label_ == "ORG" and ent.text not in institutions:
                    institutions.append(ent.text.strip())

    return {
        "highest_level": highest_label,
        "level_score": highest_level,
        "field": field,
        "institutions": institutions[:5]
    }


def extract_experience(text: str) -> dict:
    """
    Extract total years of experience by parsing date ranges.
    Also detects job titles and companies using spaCy.
    """
    total_months = 0
    positions = []

    # First check for explicit "X years of experience" statement
    exp_matches = EXPERIENCE_YEARS_PATTERN.findall(text)
    if exp_matches:
        stated_years = max(int(y) for y in exp_matches)
    else:
        stated_years = None

    intervals = []

    def add_interval(s_date, e_date):
        if s_date and e_date and 1980 <= s_date.year <= datetime.now().year + 1 and s_date <= e_date:
            # ignore unrealistic lengths (> 50 years)
            if (e_date.year - s_date.year) < 50:
                intervals.append([s_date, e_date])

    # Parse date ranges
    date_ranges = DATE_RANGE_PATTERN.findall(text)
    for start_str, end_str in date_ranges:
        s_date = _parse_date(start_str)
        e_date = _parse_date(end_str)
        add_interval(s_date, e_date)

    # Also try year-only ranges
    year_ranges = YEAR_RANGE_PATTERN.findall(text)
    for start_y, end_y in year_ranges:
        try:
            s = int(start_y)
            e = datetime.now().year if end_y.lower() in ('present', 'current') else int(end_y)
            s_date = datetime(s, 1, 1)
            e_date = datetime(e, 12, 31)
            add_interval(s_date, e_date)
        except ValueError:
            continue

    # Merge intervals
    intervals.sort(key=lambda x: x[0])
    merged = []
    for interval in intervals:
        if not merged:
            merged.append(interval)
        else:
            prev = merged[-1]
            if interval[0] <= prev[1]:
                prev[1] = max(prev[1], interval[1])
            else:
                merged.append(interval)

    # Calculate total months from merged intervals
    for s_date, e_date in merged:
        total_months += (e_date.year - s_date.year) * 12 + (e_date.month - s_date.month)

    years_from_dates = round(total_months / 12, 1)

    # Use stated years if date parsing yields 0
    final_years = stated_years if (stated_years and years_from_dates == 0) else years_from_dates

    # Extract companies using spaCy
    nlp = get_nlp()
    companies = []
    if nlp:
        exp_section = extract_section(text, "experience")
        if exp_section:
            doc = nlp(exp_section[:3000])
            for ent in doc.ents:
                if ent.label_ == "ORG" and ent.text not in companies:
                    companies.append(ent.text.strip())

    return {
        "total_years": final_years or 0,
        "total_months": total_months,
        "stated_years": stated_years,
        "companies": companies[:10],
        "positions": positions
    }


def extract_section(text: str, section_name: str) -> Optional[str]:
    """
    Extract a specific section from resume text by finding its header.
    """
    lines = text.split('\n')
    target_headers = SECTION_HEADERS.get(section_name, [])
    start_idx = None
    end_idx = len(lines)

    for i, line in enumerate(lines):
        line_clean = line.strip().lower().rstrip(':').rstrip('.')
        if line_clean in [h.lower() for h in target_headers]:
            start_idx = i + 1
        elif start_idx is not None and line_clean in HEADER_TO_SECTION:
            end_idx = i
            break

    if start_idx is not None:
        return '\n'.join(lines[start_idx:end_idx]).strip()
    return None


def extract_summary(text: str) -> str:
    """Extract professional summary/objective section."""
    section = extract_section(text, "summary")
    if section:
        return section[:800]

    # Fallback: use first paragraph
    paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 80]
    return paragraphs[0][:500] if paragraphs else ""


def extract_certifications(text: str) -> list[str]:
    """Extract certifications from resume text."""
    cert_section = extract_section(text, "certifications")
    if not cert_section:
        return []
    lines = [l.strip() for l in cert_section.split('\n') if len(l.strip()) > 5]
    return lines[:10]


def _parse_date(s: str) -> Optional[datetime]:
    """Parse a date string into a datetime object."""
    month_abbrevs = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    try:
        s = s.strip().lower()
        if s in ('present', 'current', 'now'):
            return datetime.now()
        for abbrev, num in month_abbrevs.items():
            if abbrev in s:
                year = re.search(r'\d{4}', s)
                if year:
                    return datetime(int(year.group()), num, 1)
    except Exception:
        pass
    return None


# ─── Main Extractor ─────────────────────────────────────────────────────────────

def extract_resume(text: str) -> dict:
    """
    Full extraction pipeline: runs all extractors and returns a structured dict.
    """
    nlp = get_nlp()

    name = extract_name(text, nlp)
    email = extract_email(text)
    phone = extract_phone(text)
    linkedin = extract_linkedin(text)
    github = extract_github(text)
    skills = extract_skills(text)
    education = extract_education(text)
    experience = extract_experience(text)
    summary = extract_summary(text)
    certifications = extract_certifications(text)

    return {
        "name": name or "Unknown",
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
        "summary": summary,
        "skills": skills,
        "education": education,
        "experience": experience,
        "certifications": certifications,
        "raw_text": text,
        "word_count": len(text.split())
    }


def extract_job_description(text: str) -> dict:
    """
    Extract structured requirements from a job description.
    """
    skills = extract_skills(text)
    text_lower = text.lower()

    # Extract required years of experience
    exp_matches = EXPERIENCE_YEARS_PATTERN.findall(text)
    min_years = int(exp_matches[0]) if exp_matches else 0

    # Extract education requirement
    highest_level = 0
    highest_label = ""
    for keyword, level in EDUCATION_LEVELS.items():
        if keyword in text_lower and level > highest_level:
            highest_level = level
            highest_label = keyword

    # Detect required vs preferred skills
    required_skills = []
    preferred_skills = []

    lines = text.split('\n')
    mode = "required"
    for line in lines:
        line_lower = line.lower()
        if any(w in line_lower for w in ['preferred', 'nice to have', 'bonus', 'plus', 'advantageous']):
            mode = "preferred"
        elif any(w in line_lower for w in ['required', 'must have', 'essential', 'mandatory']):
            mode = "required"

        line_skills = extract_skills(line)
        if mode == "required":
            required_skills.extend(line_skills)
        else:
            preferred_skills.extend(line_skills)

    # Deduplicate
    all_skills = list(set(skills))
    required_skills = list(set(required_skills)) if required_skills else all_skills
    preferred_skills = [s for s in set(preferred_skills) if s not in required_skills]

    return {
        "skills": all_skills,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "min_years_experience": min_years,
        "education_level": highest_label,
        "education_level_score": highest_level,
        "raw_text": text
    }
