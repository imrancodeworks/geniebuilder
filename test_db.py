import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('backend/.env')
MONGO_URI = os.getenv("MONGO_URI")
print(f"Connecting to: {MONGO_URI}")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("SUCCESS: Connected to MongoDB")
except Exception as e:
    print(f"FAILURE: {e}")
