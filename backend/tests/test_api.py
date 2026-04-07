import pytest
from fastapi.testclient import TestClient
from main import app
import uuid

client = TestClient(app)

def test_signup_login_flow():
    # Test signup
    user_data = {
        "email": f"test_{uuid.uuid4()}@example.com",
        "password": "testpassword123",
        "username": "testuser"
    }
    response = client.post("/api/signup", json=user_data)
    assert response.status_code == 200
    assert response.json()["message"] == "User registered successfully."
    
    # Test login
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    response = client.post("/api/login", json=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    token = response.json()["access_token"]
    
    # Test protected route: upload-resume
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/upload-resume", headers=headers)
    # Status code might be 400 because no file is provided, but it shouldn't be 401
    assert response.status_code != 401

def test_unauthorized_access():
    response = client.get("/api/candidates")
    assert response.status_code == 401
