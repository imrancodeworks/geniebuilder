import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from dotenv import load_dotenv

# Load variables
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET is not set in the environment or .env file.")

ALGORITHM = "HS256"
try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080")) # 1 week
except ValueError:
    ACCESS_TOKEN_EXPIRE_MINUTES = 10080

# OAuth2 scheme for extracting token from header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

class TokenData(BaseModel):
    email: str | None = None
    user_id: str | None = None

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to validate JWT tokens. 
    Returns the user data encoded in the token payload.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        # id might be missing for older tokens
        user_id: str | None = payload.get("id")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    return token_data
