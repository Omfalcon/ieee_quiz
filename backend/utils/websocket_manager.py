from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map of quiz_id -> list of connection dicts {"email": "...", "ws": WebSocket}
        self.active_connections: dict[str, list[dict]] = {}
        self.admin_connections: list[WebSocket] = []

    async def connect(self, quiz_id: str, email: str, websocket: WebSocket):
        await websocket.accept()
        if quiz_id not in self.active_connections:
            self.active_connections[quiz_id] = []
        self.active_connections[quiz_id].append({"email": email, "ws": websocket})

    def disconnect(self, quiz_id: str, email: str, websocket: WebSocket):
        if quiz_id in self.active_connections:
            self.active_connections[quiz_id] = [
                conn for conn in self.active_connections[quiz_id] if conn["ws"] != websocket
            ]
            if not self.active_connections[quiz_id]:
                del self.active_connections[quiz_id]

    async def connect_admin(self, websocket: WebSocket):
        await websocket.accept()
        self.admin_connections.append(websocket)

    def disconnect_admin(self, websocket: WebSocket):
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    async def broadcast_admin(self, message: dict):
        """Broadcasts a message to all connected admin clients."""
        for conn in list(self.admin_connections):
            try:
                await conn.send_json(message)
            except Exception:
                # Remove stale connections if needed (though disconnect_admin should handle it)
                pass

    async def kick_user(self, quiz_id: str, email: str):
        # Disconnect instances of this user inside this quiz
        if quiz_id in self.active_connections:
            for conn in self.active_connections[quiz_id]:
                if conn["email"] == email:
                    try:
                        await conn["ws"].send_json({"action": "KICKED"})
                        await conn["ws"].close(code=1008, reason="Kicked by admin")
                    except Exception as e:
                        print(f"Error kicking websocket user {email}: {e}")

# Global instance
manager = ConnectionManager()
