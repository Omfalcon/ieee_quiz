from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.routes import auth
from backend.config import settings
from backend.database import connect_db, close_db, create_indexes
from backend.routes.quiz_routes import router as quiz_router

app = FastAPI(title="IEEE UPES QuizHub API")

# ✅ ROUTES
app.include_router(quiz_router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ SESSION
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)


# ✅ DB LIFECYCLE
@app.on_event("startup")
def startup_db_client():
    connect_db()
    create_indexes()   # enforce unique constraints + create leaderboard indexes


@app.on_event("shutdown")
def shutdown_db_client():
    close_db()


@app.get("/")
def read_root():
    return {"message": "Welcome to IEEE UPES QuizHub API"}