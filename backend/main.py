from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.routes import auth
from backend.config import settings
from backend.database import connect_db, close_db, create_indexes
from backend.routes.quiz_routes import router as quiz_router
from backend.routes.user_routes import router as user_router
from backend.routes.admin_routes import router as admin_router
from backend.routes.ai_routes import router as ai_router
from backend.routes.analytics_routes import router as analytics_router
from backend.utils.jwt_utils import decode_token
from backend.utils.websocket_manager import manager

app = FastAPI(title="IEEE UPES QuizHub API")

# ✅ ROUTES
app.include_router(quiz_router)
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(user_router, prefix="/auth/student", tags=["User"])
app.include_router(admin_router, prefix="/auth/admin", tags=["Admin"])
app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(analytics_router, prefix="/admin/analytics", tags=["Analytics"])

# ── WEBSOCKET FOR REALTIME KICKS ──
@app.websocket("/ws/quiz/{quiz_id}")
async def websocket_quiz_endpoint(websocket: WebSocket, quiz_id: str, token: str = None):
    # Authenticate via token query param
    if not token or token == "null":
        await websocket.close(code=1008, reason="Missing token")
        return
        
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid token")
        return
        
    email = payload.get("sub")
    if not email:
        await websocket.close(code=1008, reason="Invalid payload")
        return

    # Add to connection manager
    await manager.connect(quiz_id, email, websocket)
    try:
        while True:
            # Keep connection alive + listen for client ping if they send it
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(quiz_id, email, websocket)

@app.websocket("/ws/leaderboard/{quiz_id}")
async def websocket_leaderboard_endpoint(websocket: WebSocket, quiz_id: str):
    """Public WebSocket for projector-mode leaderboard — no auth required."""
    await manager.connect_leaderboard(quiz_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect_leaderboard(quiz_id, websocket)


@app.websocket("/ws/admin/live")
async def websocket_admin_endpoint(websocket: WebSocket, token: str = None):
    # Authenticate via token query param
    if not token or token == "null":
        await websocket.close(code=1008, reason="Missing token")
        return
        
    payload = decode_token(token)
    if not payload or payload.get("role") != "admin":
        await websocket.close(code=1008, reason="Admin privileges required")
        return

    # Add to admin connection list
    await manager.connect_admin(websocket)
    try:
        while True:
            # Admins don't need to send anything for now
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)

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