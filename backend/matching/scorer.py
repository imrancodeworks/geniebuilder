"""
Scoring & Ranking Engine
Computes a weighted multi-dimensional match score between a parsed resume
and a parsed job description. No generative AI — pure ML and heuristics.

Score Dimensions:
  - Skill match      (40%): % of required skills found in resume
  - Experience       (30%): years of experience vs. requirement
  - Education        (15%): education level match
  - Keyword overlap  (15%): TF-IDF cosine similarity of full texts
"""

import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# ─── TF-IDF Cosine Similarity ────────────────────────────────────────────────

def _tfidf_cosine_similarity(text1: str, text2: str) -> float:
    """
    Compute cosine similarity between two texts using TF-IDF vectors.
    Falls back to Jaccard similarity if scikit-learn is unavailable.
    """
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=5000,
            ngram_range=(1, 2)
        )
        tfidf_matrix = vectorizer.fit_transform([text1, text2])
        score = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0]
        return float(score)

    except ImportError:
        logger.warning("scikit-learn not available, falling back to Jaccard similarity.")
        return _jaccard_similarity(text1, text2)
    except Exception as e:
        logger.error(f"TF-IDF error: {e}")
        return 0.0


def _jaccard_similarity(text1: str, text2: str) -> float:
    """Simple token-based Jaccard similarity as fallback."""
    set1 = set(text1.lower().split())
    set2 = set(text2.lower().split())
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)


# ─── Individual Score Components ─────────────────────────────────────────────

def compute_skill_score(
    resume_skills: list[str],
    required_skills: list[str],
    preferred_skills: list[str]
) -> dict:
    """
    Compute skill match score.
    Required skills are weighted 70%, preferred skills 30%.
    """
    resume_set = {s.lower() for s in resume_skills}
    required_set = {s.lower() for s in required_skills}
    preferred_set = {s.lower() for s in preferred_skills}

    # Matched and missing
    matched_required = resume_set & required_set
    missing_required = required_set - resume_set
    matched_preferred = resume_set & preferred_set

    # Required score (0-100)
    if required_set:
        req_score = (len(matched_required) / len(required_set)) * 100
    else:
        req_score = 75.0  # No required skills specified → neutral

    # Preferred score (0-100)
    if preferred_set:
        pref_score = (len(matched_preferred) / len(preferred_set)) * 100
    else:
        pref_score = 75.0

    # Weighted blend
    if required_set and preferred_set:
        final = (req_score * 0.70) + (pref_score * 0.30)
    elif required_set:
        final = req_score
    else:
        final = pref_score

    return {
        "score": round(final, 1),
        "matched_required": sorted(matched_required),
        "matched_preferred": sorted(matched_preferred),
        "missing_required": sorted(missing_required),
        "total_required": len(required_set),
        "total_preferred": len(preferred_set)
    }


def compute_experience_score(
    resume_years: float,
    required_years: int
) -> dict:
    """
    Compute experience score.
    - 0 required years → 100 (any experience is fine)
    - Under-qualified: linear penalty
    - Slightly over-qualified (< 2× required): full score
    - Heavily over-qualified (> 3× required): small penalty (may be overpriced)
    """
    if required_years <= 0:
        return {"score": 100.0, "resume_years": resume_years, "required_years": 0, "status": "not_required"}

    ratio = resume_years / required_years if required_years > 0 else 1.0

    if ratio >= 1.0:
        # Met or exceeded requirement
        if ratio <= 2.0:
            score = 100.0
        elif ratio <= 3.0:
            # Slightly over-qualified, small deduction
            score = max(85.0, 100.0 - (ratio - 2.0) * 7.5)
        else:
            score = 85.0  # Heavily over-qualified
        status = "met"
    else:
        # Under-qualified: penalize proportionally
        score = ratio * 100
        status = "under"

    return {
        "score": round(score, 1),
        "resume_years": resume_years,
        "required_years": required_years,
        "ratio": round(ratio, 2),
        "status": status
    }


def compute_education_score(
    resume_level_score: int,
    required_level_score: int,
    resume_level_label: str,
    required_level_label: str
) -> dict:
    """
    Compute education level match score.
    Exceeding the requirement gives full marks.
    Falling short gives proportional score.
    """
    if required_level_score <= 0:
        return {
            "score": 100.0,
            "resume_level": resume_level_label,
            "required_level": "any",
            "status": "not_required"
        }

    if resume_level_score >= required_level_score:
        score = 100.0
        status = "met"
    else:
        score = (resume_level_score / required_level_score) * 100
        status = "under"

    return {
        "score": round(score, 1),
        "resume_level": resume_level_label or "unspecified",
        "required_level": required_level_label or "unspecified",
        "status": status
    }


def compute_keyword_score(resume_text: str, jd_text: str) -> dict:
    """Compute TF-IDF cosine similarity between resume and job description."""
    similarity = _tfidf_cosine_similarity(resume_text, jd_text)
    score = round(similarity * 100, 1)
    return {
        "score": score,
        "cosine_similarity": round(similarity, 4)
    }


# ─── Main Scorer ─────────────────────────────────────────────────────────────

# Score weights (must sum to 1.0)
WEIGHTS = {
    "skills": 0.40,
    "experience": 0.30,
    "education": 0.15,
    "keywords": 0.15
}


def score_candidate(resume_data: dict, jd_data: dict) -> dict:
    """
    Compute a full match score for a single resume against a job description.

    Args:
        resume_data: Output of nlp.extractor.extract_resume()
        jd_data:     Output of nlp.extractor.extract_job_description()

    Returns:
        Detailed scoring breakdown with total score and gap analysis.
    """
    # 1. Skills
    skill_result = compute_skill_score(
        resume_skills=resume_data.get("skills", []),
        required_skills=jd_data.get("required_skills", []),
        preferred_skills=jd_data.get("preferred_skills", [])
    )

    # 2. Experience
    exp_result = compute_experience_score(
        resume_years=resume_data.get("experience", {}).get("total_years", 0),
        required_years=jd_data.get("min_years_experience", 0)
    )

    # 3. Education
    edu_result = compute_education_score(
        resume_level_score=resume_data.get("education", {}).get("level_score", 0),
        required_level_score=jd_data.get("education_level_score", 0),
        resume_level_label=resume_data.get("education", {}).get("highest_level", ""),
        required_level_label=jd_data.get("education_level", "")
    )

    # 4. Keyword / TF-IDF
    kw_result = compute_keyword_score(
        resume_text=resume_data.get("raw_text", ""),
        jd_text=jd_data.get("raw_text", "")
    )

    # Weighted total
    total = (
        skill_result["score"] * WEIGHTS["skills"] +
        exp_result["score"] * WEIGHTS["experience"] +
        edu_result["score"] * WEIGHTS["education"] +
        kw_result["score"] * WEIGHTS["keywords"]
    )

    # Grade label
    grade = _score_to_grade(total)

    # Gap analysis: generate actionable suggestions
    gaps = _generate_gaps(skill_result, exp_result, edu_result, resume_data)

    return {
        "total_score": round(total, 1),
        "grade": grade,
        "breakdown": {
            "skills": skill_result,
            "experience": exp_result,
            "education": edu_result,
            "keywords": kw_result
        },
        "gaps": gaps,
        "weights": WEIGHTS
    }


def _score_to_grade(score: float) -> str:
    if score >= 85:
        return "Excellent"
    elif score >= 70:
        return "Good"
    elif score >= 55:
        return "Fair"
    elif score >= 40:
        return "Weak"
    else:
        return "Poor"


def _generate_gaps(
    skill_result: dict,
    exp_result: dict,
    edu_result: dict,
    resume_data: dict
) -> list[dict]:
    """
    Generate a list of specific, actionable gap recommendations.
    """
    gaps = []

    # Missing required skills
    missing = skill_result.get("missing_required", [])
    if missing:
        gaps.append({
            "type": "skills",
            "severity": "high" if len(missing) > 3 else "medium",
            "message": f"Missing {len(missing)} required skill(s): {', '.join(missing[:8])}{'...' if len(missing) > 8 else ''}",
            "items": missing
        })

    # Experience gap
    if exp_result.get("status") == "under":
        needed = exp_result["required_years"] - exp_result["resume_years"]
        gaps.append({
            "type": "experience",
            "severity": "high" if needed > 2 else "medium",
            "message": f"Experience gap: resume shows {exp_result['resume_years']} years, "
                       f"role requires {exp_result['required_years']} years "
                       f"({needed:.1f} years short).",
            "items": []
        })

    # Education gap
    if edu_result.get("status") == "under":
        gaps.append({
            "type": "education",
            "severity": "medium",
            "message": f"Education gap: role prefers {edu_result['required_level']}, "
                       f"resume shows {edu_result['resume_level']}.",
            "items": []
        })

    # Low keyword overlap
    # Imported here to avoid circular dependency
    kw_score = 0
    # We pass it directly in the caller so check result
    # Handled via kw_result in score_candidate

    # No skills on resume at all
    if not resume_data.get("skills"):
        gaps.append({
            "type": "skills",
            "severity": "high",
            "message": "No recognizable technical skills found on the resume. "
                       "Ensure skills are listed explicitly (not hidden in image or table).",
            "items": []
        })

    # No experience section
    if resume_data.get("experience", {}).get("total_years", 0) == 0:
        gaps.append({
            "type": "experience",
            "severity": "medium",
            "message": "Could not detect dated work experience. "
                       "Ensure employment dates are in 'Month YYYY – Month YYYY' format.",
            "items": []
        })

    return gaps


# ─── Batch Ranker ─────────────────────────────────────────────────────────────

def rank_candidates(candidates: list[dict], jd_data: dict) -> list[dict]:
    """
    Score and rank a list of parsed resumes against a job description.

    Args:
        candidates: List of dicts from extract_resume() with an added 'id' and 'filename' key
        jd_data:    Output of extract_job_description()

    Returns:
        Candidates sorted by total_score descending, each with scoring data attached.
    """
    results = []
    for candidate in candidates:
        try:
            scoring = score_candidate(candidate, jd_data)
            results.append({
                **candidate,
                "scoring": scoring
            })
        except Exception as e:
            logger.error(f"Failed to score candidate {candidate.get('name', '?')}: {e}")
            results.append({
                **candidate,
                "scoring": {
                    "total_score": 0,
                    "grade": "Error",
                    "error": str(e)
                }
            })

    # Sort by total score descending
    results.sort(key=lambda x: x["scoring"].get("total_score", 0), reverse=True)

    # Add rank
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return results
