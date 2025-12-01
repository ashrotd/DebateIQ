"""
Data models for DebateIQ application.
"""
from typing import Optional, List, Dict
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
    audio_url: Optional[str] = None 

class DebateMode(str, Enum):
    """Mode of debate."""
    USER_VS_FIGURE = "user-vs-figure"
    FIGURE_VS_FIGURE = "figure-vs-figure"

class DebateSession(BaseModel):
    """A debate session."""
    id: str
    topic: str
    participants: List[str]
    status: str 
    created_at: datetime
    updated_at: datetime
    messages: List[DebateMessage] = []
    current_turn: int = 0
    max_turns: int = 10
    mode: Optional[DebateMode] = DebateMode.USER_VS_FIGURE

class CreateDebateRequest(BaseModel):
    """Request to create a new debate."""
    topic: str
    participants: List[str] 
    max_turns: Optional[int] = 10
    mode: Optional[DebateMode] = DebateMode.USER_VS_FIGURE

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
    type: str  
    timestamp: datetime
    audio_url: Optional[str] = None 


class JudgeEvaluationRequest(BaseModel):
    """Request for judge to evaluate a debate exchange."""
    session_id: str
    user_argument: str
    ai_argument: str


class JudgeEvaluationResponse(BaseModel):
    """Response from judge evaluation."""
    user_scores: Dict
    ai_scores: Dict
    fact_checks: List[Dict]
    reasoning: Dict
    winner: str
    winner_reason: str
