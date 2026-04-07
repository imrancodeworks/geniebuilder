import pytest
from matching.scorer import compute_skill_score, compute_experience_score, compute_education_score

def test_skill_score_no_required():
    # Test skill matching when no required skills are specified
    res = compute_skill_score(["python", "java"], [], ["python"])
    assert res["score"] == 75.0  # Default neutral score

def test_skill_score_partial_match():
    # Test partial match of required and preferred skills
    res = compute_skill_score(["python", "java"], ["python", "c++"], ["java"])
    # Required score: 50% / Preferred score: 100%
    # Blend: (50 * 0.70) + (100 * 0.30) = 35 + 30 = 65
    assert res["score"] == 65.0

def test_experience_score_under():
    # Test under-qualification: 2 years vs 5 required
    res = compute_experience_score(2.0, 5)
    assert res["score"] == 40.0
    assert res["status"] == "under"

def test_experience_score_met():
    # Test exact match
    res = compute_experience_score(5.0, 5)
    assert res["score"] == 100.0
    assert res["status"] == "met"

def test_experience_score_overqualified():
    # Test over-qualification: 12 years vs 3 required (4x ratio)
    # Ratio > 3x: should be 85.0 penalty
    res = compute_experience_score(12.0, 3)
    assert res["score"] == 85.0
    assert res["status"] == "met"

def test_education_score_met():
    # Test Bachelor's (3) matching Bachelor's (3)
    res = compute_education_score(3, 3, "Bachelor's", "Bachelor's")
    assert res["score"] == 100.0
    assert res["status"] == "met"

def test_education_score_under():
    # Test High School (1) for Master's (4)
    res = compute_education_score(1, 4, "High School", "Master's")
    assert res["score"] == 25.0
    assert res["status"] == "under"
