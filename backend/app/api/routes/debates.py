"""
Debate API Routes - Endpoints for creating and managing debates.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
import json
from datetime import datetime

from app.models import (
    CreateDebateRequest,
    DebateResponse,
    DebateSession,
    FigureId
)
from app.services.debate_orchestrator import debate_orchestrator

router = APIRouter(prefix="/api/v1/debates", tags=["debates"])

@router.post("/", response_model=DebateResponse)
async def create_debate(request: CreateDebateRequest):
    """
    Create a new debate session.

    Args:
        request: Debate creation request with topic, participants, and settings

    Returns:
        DebateResponse with session details
    """
    try:
        if len(request.participants) < 1:
            raise HTTPException(
                status_code=400,
                detail="At least 1 participant is required for a debate"
            )

        if len(request.participants) > 3:
            raise HTTPException(
                status_code=400,
                detail="Maximum 3 participants allowed per debate"
            )

        # Create debate session
        session = debate_orchestrator.create_session(
            topic=request.topic,
            participants=request.participants,
            max_turns=request.max_turns or 10
        )

        return DebateResponse(
            session=session,
            message="Debate session created successfully. Use the session ID to start the debate."
        )

    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in create_debate: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=DebateSession)
async def get_debate(session_id: str):
    """
    Get details of a specific debate session.

    Args:
        session_id: The debate session ID

    Returns:
        DebateSession with full debate details
    """
    session = debate_orchestrator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    return session


@router.get("/", response_model=List[DebateSession])
async def list_debates():
    """
    List all debate sessions.

    Returns:
        List of all debate sessions
    """
    return debate_orchestrator.list_sessions()


@router.get("/{session_id}/start")
async def start_debate(session_id: str):
    """
    Start a debate and stream messages in real-time using Server-Sent Events (SSE).

    Args:
        session_id: The debate session ID

    Returns:
        StreamingResponse with debate messages as they are generated
    """
    session = debate_orchestrator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Debate already completed")

    if session.status == "active":
        raise HTTPException(status_code=400, detail="Debate already in progress")

    async def event_generator():
        """Generate Server-Sent Events for debate messages."""
        try:
            async for message in debate_orchestrator.start_debate(session_id):
                # Format as SSE
                data = {
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

                yield f"data: {json.dumps(data)}\n\n"

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete', 'message': 'Debate completed'})}\n\n"

        except Exception as e:
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/{session_id}/message")
async def send_user_message(session_id: str, message: dict):
    """
    Send a user message to the debate and get AI response.

    Args:
        session_id: The debate session ID
        message: Dict with 'content' key containing user's message

    Returns:
        AI agent's response
    """
    session = debate_orchestrator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Debate already completed")

    user_content = message.get("content", "")
    if not user_content:
        raise HTTPException(status_code=400, detail="Message content is required")

    try:
        # Get AI response for user's message
        response_message = await debate_orchestrator.send_user_message(
            session_id,
            user_content
        )

        return {
            "user_message": {
                "content": user_content,
                "timestamp": datetime.now().isoformat()
            },
            "ai_response": {
                "id": response_message.id,
                "speaker_name": response_message.speaker_name,
                "content": response_message.content,
                "timestamp": response_message.timestamp.isoformat()
            }
        }
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in send_user_message: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_debate(session_id: str):
    """
    Delete a debate session.

    Args:
        session_id: The debate session ID

    Returns:
        Success message
    """
    session = debate_orchestrator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Debate session not found")

    del debate_orchestrator.sessions[session_id]

    return {"message": "Debate session deleted successfully"}
