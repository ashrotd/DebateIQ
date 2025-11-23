import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.models import FigureId
from app.agents.lincoln_agent import lincoln_agent
from app.agents.tesla_agent import tesla_agent
from app.agents.hitler_agent import hitler_agent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.genai import types
from app.services.tts_service import tts_service
import logging

logger = logging.getLogger(__name__)

class DebateOrchestrator:
    """Orchestrates multi-agent debates between historical figures."""

    def __init__(self):
        """Initialize the debate orchestrator."""
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
        self.APP_NAME = "debate_arena"
        self.USER_ID = "debate_user"
        self.MODEL_NAME = "gemini-2.5-flash-lite"
        # Session service shared across all runners
        self.session_service = None
        self.runner = None
        # Map to store runner and session info per debate session
        self.debate_sessions: Dict[str, Dict] = {}

    async def create_session(
        self,
        topic: str,
        participants: List[FigureId],
        max_turns: int = 10
    ) -> Dict:
        """Create a new debate session with Google ADK."""
        session_id = str(uuid.uuid4())

        # Get the first participant's agent
        participant_id = participants[0]
        agent_info = self.agent_map[participant_id]
        agent = agent_info["agent"]
        agent_name = agent_info["name"]
        self.session_service = InMemorySessionService()

        # Store participants list for TTS voice selection
        session_participants = participants

        # Create a runner for this agent
        runner = Runner(
            agent=agent,
            app_name=self.APP_NAME,
            session_service=self.session_service
        )

        # Create Google ADK session
        adk_session = await self.session_service.create_session(
            app_name=self.APP_NAME,
            user_id=self.USER_ID,
            session_id=session_id
        )

        # Store session info
        self.debate_sessions[session_id] = {
            "id": session_id,
            "topic": topic,
            "participants": [p.value for p in participants],
            "participant_enums": session_participants,  # Store enum objects for voice selection
            "participant_name": agent_name,
            "runner": runner,
            "adk_session": adk_session,
            "max_turns": max_turns,
            "messages": []
        }

        return {
            "session_id": session_id,
            "topic": topic,
            "participants": [p.value for p in participants],
            "participant_name": agent_name
        }

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get a debate session by ID."""
        return self.debate_sessions.get(session_id)

    def list_sessions(self) -> List[Dict]:
        """List all debate sessions."""
        return [
            {
                "id": s["id"],
                "topic": s["topic"],
                "participants": s["participants"],
                "participant_name": s["participant_name"],
                "message_count": len(s["messages"])
            }
            for s in self.debate_sessions.values()
        ]

    async def send_user_message(self, session_id: str, user_content: str) -> Dict:
        """Send a user message and get AI response using Google ADK sessions."""
        session_data = self.debate_sessions.get(session_id)
        if not session_data:
            raise ValueError(f"Session {session_id} not found")

        runner = session_data["runner"]
        topic = session_data["topic"]
        participant_name = session_data["participant_name"]
        participants = session_data.get("participant_enums", [])

        # Create prompt that includes the debate topic
        prompt = f"""You are debating the topic: '{topic}' 
        User's message: {user_content} 
        Please respond to the user's argument with your perspective on this topic. Stay in character and engage directly with their points."""

        # Create message content
        new_message = types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )

        # Get AI response using Google ADK
        response_text = ""
        print(f"\n[DEBUG] Sending to {participant_name}: {user_content}")

        async for event in runner.run_async(
            user_id=self.USER_ID,
            session_id=session_id,
            new_message=new_message
        ):
            # Extract text from events
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            response_text += part.text
            elif hasattr(event, 'text') and event.text:
                response_text += event.text

        print(f"[DEBUG] {participant_name} responded: {response_text[:100]}...")

        # Generate audio for the AI response
        audio_url = None
        try:
            # Use the first participant's ID for voice selection
            speaker_id = participants[0].value if participants else "default"
            audio_url = tts_service.generate_speech(response_text.strip(), speaker_id)
            logger.info(f"Generated audio URL: {audio_url}")
        except Exception as e:
            logger.error(f"Failed to generate audio: {e}")

        # Store messages in session
        session_data["messages"].append({
            "role": "user",
            "content": user_content,
            "timestamp": datetime.now().isoformat()
        })
        session_data["messages"].append({
            "role": "agent",
            "content": response_text.strip(),
            "speaker_name": participant_name,
            "timestamp": datetime.now().isoformat(),
            "audio_url": audio_url
        })

        return {
            "id": str(uuid.uuid4()),
            "speaker_name": participant_name,
            "content": response_text.strip(),
            "timestamp": datetime.now().isoformat(),
            "audio_url": audio_url
        }

    async def run_session(self, runner_instance: Runner, user_queries: list[str] | str = None, session_name: str = "default", session_service: InMemorySessionService = None):
        print(f"\n ### Session: {session_name}")

        # Get app name from the Runner
        app_name = runner_instance.app_name

        # Attempt to create a new session or retrieve an existing one
        try:
            session = await session_service.create_session(
                app_name=app_name,
                user_id=self.USER_ID,
                session_id=session_name
            )
        except:
            session = await session_service.get_session(
                app_name=app_name,
                user_id=self.USER_ID,
                session_id=session_name
            )

        # Process queries if provided
        if user_queries:
            # Convert single query to list for uniform processing
            if isinstance(user_queries, str):
                user_queries = [user_queries]

            # Process each query in the list sequentially
            for query in user_queries:
                print(f"\nUser > {query}")

                # Convert the query string to ADK Content format
                query_content = types.Content(
                    role="user",
                    parts=[types.Part(text=query)]
                )

                # Stream the agent's response asynchronously
                async for event in runner_instance.run_async(
                    user_id=self.USER_ID,
                    session_id=session.id,
                    new_message=query_content
                ):
                    if event.content and event.content.parts:
                        text = event.content.parts[0].text
                        if text and text != "None":
                            print(f"{self.MODEL_NAME} > {text}")
        else:
            print("No queries!")


# Global orchestrator instance
debate_orchestrator = DebateOrchestrator()
