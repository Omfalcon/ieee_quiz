from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from backend.routes import auth
from backend.config import settings
from backend.database import connect_db, close_db
from backend.quiz_routes import router as quiz_router

app = FastAPI(title="IEEE UPES QuizHub API")
app.include_router(quiz_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)

@app.on_event("startup")
def startup_db_client():
    connect_db()

@app.on_event("shutdown")
def shutdown_db_client():
    close_db()

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to IEEE UPES QuizHub API"}
