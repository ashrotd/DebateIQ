"""
Debate API Routes - Endpoints for creating and managing debates.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import json
from datetime import datetime
from app.services.tts_service import tts_service

from app.models import (
    CreateDebateRequest,
    DebateSession,
    FigureId
)
from app.services.debate_orchestrator import debate_orchestrator

router = APIRouter(prefix="/api/v1/debates", tags=["debates"])

@router.post("/")
async def create_debate(request: CreateDebateRequest):
    """
    Create a new debate session using Google ADK.

    Args:
        request: Debate creation request with topic, participants, and settings

    Returns:
        Session details with session_id
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

        # Create debate session with Google ADK
        session = await debate_orchestrator.create_session(
            topic=request.topic,
            participants=request.participants,
            max_turns=request.max_turns or 10
        )

        return {
            "session": session,
            "message": "Debate session created successfully with Google ADK."
        }

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


@router.post("/{session_id}/voice-message")
async def send_voice_message(
    session_id: str,
    audio: UploadFile = File(...)
):
    """
    Receive user's voice message, transcribe it using Google Speech-to-Text,
    and get AI response.

    Args:
        session_id: The debate session ID
        audio: Audio file (webm format from browser)

    Returns:
        User's transcribed message and AI agent's response
    """
    try:
        # Read audio file
        audio_content = await audio.read()
        
        # Transcribe audio using Google Speech-to-Text
        transcribed_text = await tts_service.transcribe_audio(audio_content)
        
        if not transcribed_text:
            raise HTTPException(
                status_code=400, 
                detail="Could not transcribe audio. Please try again."
            )

        # Get AI response for transcribed message
        response_message = await debate_orchestrator.send_user_message(
            session_id,
            transcribed_text
        )

        return {
            "user_message": {
                "content": transcribed_text,
                "timestamp": datetime.now().isoformat()
            },
            "ai_response": {
                "id": response_message["id"],
                "speaker_name": response_message["speaker_name"],
                "content": response_message["content"],
                "timestamp": response_message["timestamp"],
                "audio_url": response_message.get("audio_url")
            }
        }
        
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        print(f"ERROR in send_voice_message: {error_detail}")
        raise HTTPException(status_code=500, detail=str(e))


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
    # session = debate_orchestrator.get_session(session_id)
    # if not session:
    #     raise HTTPException(status_code=404, detail="Debate session not found")

    # if session.status == "completed":
    #     raise HTTPException(status_code=400, detail="Debate already completed")

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
                "id": response_message["id"],   
                "speaker_name": response_message["speaker_name"],
                "content": response_message["content"],
                "timestamp": response_message["timestamp"],
                "audio_url": response_message.get("audio_url")

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
