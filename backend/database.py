import os
import logging
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Fallback to local MongoDB if MONGO_URI is missing
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set in the environment or .env file.")


# Global variables for db and collections
client = None
db = None
candidates_collection = None
jd_collection = None
users_collection = None

# Initialize MongoDB Connection
try:
    logger.info(f"Connecting to MongoDB at: {MONGO_URI}")
    # Short timeout to gracefully fall back if completely unreachable
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    
    # Trigger a server selection to test connection immediately
    client.admin.command('ping')
    
    db = client["resume_reader_db"]
    candidates_collection = db["candidates"]
    jd_collection = db["job_descriptions"]
    users_collection = db["users"]
    otp_collection = db["otps"]
    
    logger.info("Successfully connected to MongoDB.")
    
except Exception as e:
    logger.error(f"FAILURE: Could not connect to MongoDB. Is your cluster running? Error: {e}")
    client = None
