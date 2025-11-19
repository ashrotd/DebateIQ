import uuid
from datetime import datetime
from typing import Dict, List, Optional, AsyncIterator
from app.models import (
    DebateSession, DebateMessage, MessageType, DebateRole, FigureId
)
from app.agents.lincoln_agent import lincoln_agent
from app.agents.tesla_agent import tesla_agent
from app.agents.hitler_agent import hitler_agent
from app.agents.moderator_agent import moderator_agent

class DebateOrchestrator:
    """Orchestrates multi-agent debates between historical figures."""

    def __init__(self):
        """Initialize the debate orchestrator."""
        self.sessions: Dict[str, DebateSession] = {}
        self.agent_map = {
            FigureId.LINCOLN: {
                "agent": lincoln_agent,
                "name": "Abraham Lincoln"
            },
            FigureId.TESLA: {
                "agent": tesla_agent,
                "name": "Nikola Tesla"
            },
            FigureId.HITLER: {
                "agent": hitler_agent,
                "name": "Adolf Hitler"
            }
        }

    def create_session(
        self,
        topic: str,
        participants: List[FigureId],
        max_turns: int = 10
    ) -> DebateSession:
        """Create a new debate session."""
        session_id = str(uuid.uuid4())
        session = DebateSession(
            id=session_id,
            topic=topic,
            participants=[p.value for p in participants],
            status="waiting",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            messages=[],
            current_turn=0,
            max_turns=max_turns
        )
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[DebateSession]:
        """Get a debate session by ID."""
        return self.sessions.get(session_id)

    async def start_debate(self, session_id: str) -> AsyncIterator[DebateMessage]:
        """
        Start a debate and yield messages as they are generated.
        This is an async generator for streaming responses.
        """
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.status = "active"
        session.updated_at = datetime.now()

        # Generate moderator opening
        opening_prompt = f"Welcome everyone to today's debate on: '{session.topic}'. Please provide a brief opening statement introducing the topic and the participants: {', '.join([self.agent_map[FigureId(p)]['name'] for p in session.participants])}."

        opening_message = await self._get_agent_response(
            moderator_agent,
            opening_prompt,
            session_id,
            "moderator",
            "Moderator",
            MessageType.MODERATOR,
            0
        )
        session.messages.append(opening_message)
        yield opening_message

        # Main debate loop
        for turn in range(1, session.max_turns + 1):
            session.current_turn = turn

            # Each participant speaks
            for participant_id in session.participants:
                participant_info = self.agent_map[FigureId(participant_id)]
                agent = participant_info["agent"]
                name = participant_info["name"]

                # Build context from previous messages
                context = self._build_context(session, participant_id)

                # Determine message type based on turn
                if turn == 1:
                    message_type = MessageType.OPENING
                    prompt = f"Debate topic: '{session.topic}'\n\nPlease provide your opening statement on this topic."
                elif turn == session.max_turns:
                    message_type = MessageType.CLOSING
                    prompt = f"Debate topic: '{session.topic}'\n\nConversation so far:\n{context}\n\nPlease provide your closing statement."
                else:
                    message_type = MessageType.ARGUMENT
                    prompt = f"Debate topic: '{session.topic}'\n\nConversation so far:\n{context}\n\nPlease respond to the previous arguments and present your next point."

                # Get response from agent
                message = await self._get_agent_response(
                    agent,
                    prompt,
                    session_id,
                    participant_id,
                    name,
                    message_type,
                    turn
                )
                session.messages.append(message)
                yield message

            # Moderator summary every few turns (except on last turn)
            if turn % 3 == 0 and turn != session.max_turns:
                context = self._build_context(session, "moderator")
                summary_prompt = f"Debate topic: '{session.topic}'\n\nRecent discussion:\n{context}\n\nPlease provide a brief summary of key points and pose a follow-up question to deepen the debate."

                moderator_message = await self._get_agent_response(
                    moderator_agent,
                    summary_prompt,
                    session_id,
                    "moderator",
                    "Moderator",
                    MessageType.MODERATOR,
                    turn
                )
                session.messages.append(moderator_message)
                yield moderator_message

        # Final moderator closing
        context = self._build_context(session, "moderator")
        closing_prompt = f"Debate topic: '{session.topic}'\n\nFull debate:\n{context}\n\nPlease provide a final summary highlighting the key arguments from each side and any areas of agreement or interesting contrasts."

        closing_message = await self._get_agent_response(
            moderator_agent,
            closing_prompt,
            session_id,
            "moderator",
            "Moderator",
            MessageType.MODERATOR,
            session.max_turns
        )
        session.messages.append(closing_message)
        session.status = "completed"
        session.updated_at = datetime.now()
        yield closing_message

    async def _get_agent_response(
        self,
        agent,
        prompt: str,
        session_id: str,
        speaker_id: str,
        speaker_name: str,
        message_type: MessageType,
        turn: int
    ) -> DebateMessage:
        """Get a response from an agent."""
        from google.adk.runners import InMemoryRunner
        from google.genai import types

        # Create runner for this agent
        app_name = 'debate_arena'
        runner = InMemoryRunner(
            app_name=app_name,
            agent=agent,
        )

        # Create unique session ID for this agent conversation
        agent_session_id = f"{session_id}_{speaker_id}_{turn}"
        user_id = f"debate_{session_id}"

        # Create session
        await runner.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=agent_session_id
        )

        # Create message content
        new_message = types.Content(
            parts=[types.Part(text=prompt)]
        )

        # Collect the full response
        content = ""
        async for event in runner.run_async(
            user_id=user_id,
            session_id=agent_session_id,
            new_message=new_message
        ):
            # Extract text from events
            if hasattr(event, 'content') and event.content:
                # Content has parts, extract text from each part
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            content += part.text
            elif hasattr(event, 'text') and event.text:
                content += event.text

        message = DebateMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            speaker_id=speaker_id,
            speaker_name=speaker_name,
            role=DebateRole.MODERATOR if speaker_id == "moderator" else DebateRole.PARTICIPANT,
            message_type=message_type,
            content=content.strip(),
            timestamp=datetime.now(),
            turn_number=turn
        )

        return message

    def _build_context(self, session: DebateSession, current_speaker: str, last_n: int = 5) -> str:
        """Build conversation context from recent messages."""
        recent_messages = session.messages[-last_n:] if len(session.messages) > last_n else session.messages

        context_parts = []
        for msg in recent_messages:
            if msg.speaker_id != current_speaker:  # Don't include own messages
                context_parts.append(f"{msg.speaker_name}: {msg.content}")

        return "\n\n".join(context_parts)

    def list_sessions(self) -> List[DebateSession]:
        """List all debate sessions."""
        return list(self.sessions.values())

    async def send_user_message(self, session_id: str, user_content: str) -> DebateMessage:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Add user message to session
        user_message = DebateMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            speaker_id="user",
            speaker_name="You",
            role=DebateRole.USER,
            message_type=MessageType.ARGUMENT,
            content=user_content,
            timestamp=datetime.now(),
            turn_number=session.current_turn
        )
        session.messages.append(user_message)

        # Get the first participant as the AI opponent
        if not session.participants:
            raise ValueError("No participants in session")

        opponent_id = session.participants[0]
        opponent_info = self.agent_map[FigureId(opponent_id)]
        opponent_agent = opponent_info["agent"]
        opponent_name = opponent_info["name"]

        # Build context from conversation history
        context = self._build_context_for_user_debate(session)

        # Create prompt for AI with full context
        prompt = f"""Debate topic: '{session.topic}'

Conversation history:
{context}

User's latest argument:
{user_content}

Please respond to the user's argument with your perspective on this topic. Stay in character and engage directly with their points."""

        # Get AI response
        ai_message = await self._get_agent_response(
            opponent_agent,
            prompt,
            session_id,
            opponent_id,
            opponent_name,
            MessageType.ARGUMENT,
            session.current_turn
        )

        session.messages.append(ai_message)
        session.current_turn += 1
        session.updated_at = datetime.now()

        return ai_message

    def _build_context_for_user_debate(self, session: DebateSession, last_n: int = 10) -> str:
        """Build conversation context for user-interactive debates."""
        recent_messages = session.messages[-last_n:] if len(session.messages) > last_n else session.messages

        context_parts = []
        for msg in recent_messages:
            speaker = "User" if msg.speaker_id == "user" else msg.speaker_name
            context_parts.append(f"{speaker}: {msg.content}")

        return "\n\n".join(context_parts)

# Global orchestrator instance
debate_orchestrator = DebateOrchestrator()
