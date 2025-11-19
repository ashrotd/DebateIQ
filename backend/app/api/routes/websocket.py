"""
WebSocket Routes - Real-time debate streaming via WebSocket.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
import logging

from app.services.debate_orchestrator import debate_orchestrator

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

class ConnectionManager:
    """Manages WebSocket connections for debate sessions."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")

    def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        """Send a message to a specific session's WebSocket."""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()


@router.websocket("/ws/debates/{session_id}")
async def websocket_debate_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)

    try:
        session = debate_orchestrator.get_session(session_id)
        if not session:
            await websocket.send_json({
                "type": "error",
                "message": "Debate session not found"
            })
            await websocket.close()
            return

        if session.status == "completed":
            await websocket.send_json({
                "type": "error",
                "message": "Debate already completed"
            })
            await websocket.close()
            return

        if session.status == "active":
            await websocket.send_json({
                "type": "error",
                "message": "Debate already in progress"
            })
            await websocket.close()
            return

        await websocket.send_json({
            "type": "status",
            "message": "Connected to debate session",
            "session_id": session_id
        })

        try:
            await websocket.send_json({
                "type": "status",
                "message": "Debate starting...",
                "session_id": session_id
            })

            async for message in debate_orchestrator.start_debate(session_id):
                message_data = {
                    "type": "debate_message",
                    "id": message.id,
                    "session_id": message.session_id,
                    "speaker_id": message.speaker_id,
                    "speaker_name": message.speaker_name,
                    "role": message.role.value,
                    "message_type": message.message_type.value,
                    "content": message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "turn_number": message.turn_number
                }

                await manager.send_message(session_id, message_data)

            # Send completion message
            await manager.send_message(session_id, {
                "type": "complete",
                "message": "Debate completed successfully",
                "session_id": session_id
            })

        except Exception as e:
            logger.error(f"Error during debate: {e}")
            await manager.send_message(session_id, {
                "type": "error",
                "message": f"Error during debate: {str(e)}"
            })

        while True:
            try:
                data = await websocket.receive_text()
                await websocket.send_json({
                    "type": "echo",
                    "message": data
                })
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        logger.info(f"Client disconnected from session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(session_id)
