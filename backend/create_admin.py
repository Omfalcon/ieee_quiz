from passlib.context import CryptContext
from pymongo import MongoClient
from backend.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_admin():
    print("=== Create Admin User ===")
    email = input("Email: ").strip()
    name = input("Name: ").strip()
    password = input("Password: ").strip()
    
    client = MongoClient(settings.MONGO_URI)
    db = client.get_default_database()
    
    existing_user = db.users.find_one({"email": email})
    if existing_user:
        print("User with this email already exists!")
        return

    hashed_pwd = get_password_hash(password)
    user_doc = {
        "email": email,
        "name": name,
        "password_hash": hashed_pwd,
        "role": "admin",
        "is_verified": True
    }
    
    db.users.insert_one(user_doc)
    print(f"Admin user {email} created successfully!")

if __name__ == "__main__":
    create_admin()
