import pytest
from datetime import datetime
from nlp.extractor import _parse_date, extract_experience

def test_parse_date():
    assert _parse_date("Jan 2020").year == 2020
    assert _parse_date("Jan 2020").month == 1
    assert _parse_date("Present").year == datetime.now().year
    assert _parse_date("Invalid") is None

def test_extract_experience_overlapping():
    # Test overlapping intervals: 
    # Job 1: Jan 2020 - Dec 2021 (24 months)
    # Job 2: Jan 2021 - Dec 2022 (24 months, but overlaps with Job 1 by 12 months)
    # Total should be Jan 2020 - Dec 2022 = 36 months = 3.0 years
    text = """
    Experience
    Software Engineer | Company A
    January 2020 – December 2021
    
    Data Scientist | Company B
    January 2021 – December 2022
    """
    exp = extract_experience(text)
    assert exp["total_months"] == 36
    assert exp["total_years"] == 3.0

def test_extract_experience_gap():
    # Job 1: Jan 2020 - Dec 2020 (12 months)
    # Gap: 2021
    # Job 2: Jan 2022 - Dec 2022 (12 months)
    # Total: 24 months = 2.0 years
    text = """
    Experience
    Job 1: Jan 2020 - Dec 2020
    Job 2: Jan 2022 - Dec 2022
    """
    exp = extract_experience(text)
    assert exp["total_months"] == 24
    assert exp["total_years"] == 2.0

def test_stated_years_fallback():
    # No dates, but explicit statement
    text = "I have 5 years of experience in Python."
    exp = extract_experience(text)
    assert exp["total_years"] == 5.0
    assert exp["stated_years"] == 5
