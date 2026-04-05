from pymongo import MongoClient
from backend.config import settings

client = None
db = None

def connect_db():
    global client, db
    try:
        client = MongoClient(settings.MONGO_URI)
        # Explicitly fetching 'ieee_quiz' to avoid ConfigurationError on standard Atlas URIs
        db = client.get_database("ieee_quiz")
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")

def close_db():
    if client:
        client.close()

def get_db():
    return db
