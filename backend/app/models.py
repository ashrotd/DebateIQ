"""
Data models for DebateIQ application.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class FigureId(str, Enum):
    """Historical figure identifiers."""
    LINCOLN = "lincoln"
    TESLA = "tesla"
    HITLER = "hitler"


class CreateCustomFigureRequest(BaseModel):
    """Request to create a custom historical figure with RAG."""
    figure_name: str = Field(..., min_length=1, description="Display name of the historical figure")
    topic: str = Field(..., min_length=1, description="Main Wikipedia topic for RAG")
    related_topics: List[str] = Field(default=[], description="Related Wikipedia topics for context")
    specialty: Optional[str] = Field(None, description="Brief description of expertise")
    era: Optional[str] = Field(None, description="Historical era or time period")


class CustomFigureResponse(BaseModel):
    """Response for custom figure creation."""
    id: str
    name: str
    topic: str
    related_topics: List[str]
    specialty: str
    era: str
    is_custom: bool
    message: str

class DebateRole(str, Enum):
    """Roles in a debate."""
    MODERATOR = "moderator"
    PARTICIPANT = "participant"
    USER = "user"

class MessageType(str, Enum):
    """Types of messages in a debate."""
    OPENING = "opening"
    ARGUMENT = "argument"
    REBUTTAL = "rebuttal"
    CLOSING = "closing"
    QUESTION = "question"
    ANSWER = "answer"
    MODERATOR = "moderator"

class DebateMessage(BaseModel):
    """A single message in a debate."""
    id: str
    session_id: str
    speaker_id: str
    speaker_name: str
    role: DebateRole
    message_type: MessageType
    content: str
    timestamp: datetime
    turn_number: int
    audio_url: Optional[str] = None  # URL to audio file for text-to-speech

class DebateSession(BaseModel):
    """A debate session."""
    id: str
    topic: str
    participants: List[str]  # List of figure IDs
    status: str  # 'waiting', 'active', 'completed'
    created_at: datetime
    updated_at: datetime
    messages: List[DebateMessage] = []
    current_turn: int = 0
    max_turns: int = 10

class CreateDebateRequest(BaseModel):
    """Request to create a new debate."""
    topic: str
    participants: List[str]  # Can be FigureId values or custom figure IDs
    max_turns: Optional[int] = 10

class DebateResponse(BaseModel):
    """Response containing debate information."""
    # session: DebateSession
    message: str

class StreamedMessage(BaseModel):
    """A message streamed during debate."""
    session_id: str
    speaker_id: str
    speaker_name: str
    content: str
    type: str  # 'message', 'status', 'error', 'complete'
    timestamp: datetime
    audio_url: Optional[str] = None  # URL to audio file for text-to-speech
