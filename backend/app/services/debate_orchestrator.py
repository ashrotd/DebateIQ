import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union
from app.models import FigureId
from app.agents.lincoln_agent import lincoln_agent
from app.agents.tesla_agent import tesla_agent
from app.agents.hitler_agent import hitler_agent
from app.services.custom_figure_store import custom_figure_store
from app.agents.custom_agent_factory import CustomAgentFactory
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

    def _get_agent_info(self, participant_id: str) -> Dict:
       
        try:
            figure_enum = FigureId(participant_id)
            return self.agent_map[figure_enum]
        except (ValueError, KeyError):
            pass

        # Check if it's a custom figure
        custom_agent = custom_figure_store.get_agent(participant_id)
        if custom_agent:
            return {
                "agent": custom_agent["agent"],
                "name": custom_agent["figure_name"],
                "is_custom": True,
                "agent_data": custom_agent  # Full agent data for RAG
            }

        figure_data = custom_figure_store.get_figure(participant_id)
        if figure_data:
            logger.info(f"Loading custom agent for {participant_id}")
            agent_data = CustomAgentFactory.create_agent(
                figure_name=figure_data["name"],
                figure_id=figure_data["id"],
                topic=figure_data["topic"],
                related_topics=figure_data["related_topics"],
                specialty=figure_data["specialty"]
            )
            custom_figure_store.register_agent(participant_id, agent_data)
            return {
                "agent": agent_data["agent"],
                "name": agent_data["figure_name"],
                "is_custom": True,
                "agent_data": agent_data
            }

        raise ValueError(f"Unknown figure: {participant_id}")

    async def create_session(
        self,
        topic: str,
        participants: List,
        max_turns: int = 10,
        mode: str = "user-vs-figure"
    ) -> Dict:
        session_id = str(uuid.uuid4())

        # Convert participants to string IDs
        participant_ids = [
            p.value if isinstance(p, FigureId) else p
            for p in participants
        ]

        # For figure-vs-figure mode, we need two agents
        if mode == "figure-vs-figure":
            if len(participant_ids) != 2:
                raise ValueError("Figure-vs-figure mode requires exactly 2 participants")

            # Get both agents
            agent_info_1 = self._get_agent_info(participant_ids[0])
            agent_info_2 = self._get_agent_info(participant_ids[1])

            self.session_service = InMemorySessionService()

            # Create runners for both agents
            runner_1 = Runner(
                agent=agent_info_1["agent"],
                app_name=self.APP_NAME,
                session_service=self.session_service
            )
            runner_2 = Runner(
                agent=agent_info_2["agent"],
                app_name=self.APP_NAME,
                session_service=self.session_service
            )

            # Create Google ADK session
            adk_session = await self.session_service.create_session(
                app_name=self.APP_NAME,
                user_id=self.USER_ID,
                session_id=session_id
            )

            # Store session info for figure-vs-figure
            self.debate_sessions[session_id] = {
                "id": session_id,
                "topic": topic,
                "participants": participant_ids,
                "mode": mode,
                "agents": [
                    {
                        "id": participant_ids[0],
                        "name": agent_info_1["name"],
                        "info": agent_info_1,
                        "runner": runner_1,
                        "is_custom": agent_info_1.get("is_custom", False)
                    },
                    {
                        "id": participant_ids[1],
                        "name": agent_info_2["name"],
                        "info": agent_info_2,
                        "runner": runner_2,
                        "is_custom": agent_info_2.get("is_custom", False)
                    }
                ],
                "adk_session": adk_session,
                "max_turns": max_turns,
                "messages": [],
                "evaluations": [],
                "current_speaker": 0 
            }

            return {
                "session_id": session_id,
                "topic": topic,
                "participants": participant_ids,
                "participant_name": f"{agent_info_1['name']} vs {agent_info_2['name']}",
                "mode": mode
            }
        else:
            participant_id = participant_ids[0]
            agent_info = self._get_agent_info(participant_id)
            agent = agent_info["agent"]
            agent_name = agent_info["name"]
            is_custom = agent_info.get("is_custom", False)

            self.session_service = InMemorySessionService()

            runner = Runner(
                agent=agent,
                app_name=self.APP_NAME,
                session_service=self.session_service
            )

            adk_session = await self.session_service.create_session(
                app_name=self.APP_NAME,
                user_id=self.USER_ID,
                session_id=session_id
            )

            self.debate_sessions[session_id] = {
                "id": session_id,
                "topic": topic,
                "participants": participant_ids,
                "participant_id": participant_id,
                "participant_name": agent_name,
                "is_custom": is_custom,
                "agent_info": agent_info,
                "runner": runner,
                "adk_session": adk_session,
                "max_turns": max_turns,
                "mode": mode,
                "messages": [],
                "evaluations": [] 
            }

            return {
                "session_id": session_id,
                "topic": topic,
                "participants": participant_ids,
                "participant_name": agent_name,
                "mode": mode
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
        participant_id = session_data["participant_id"]
        is_custom = session_data.get("is_custom", False)
        agent_info = session_data.get("agent_info", {})

        # For custom agents with RAG, update context before generating response
        if is_custom and "agent_data" in agent_info:
            logger.info(f"Updating RAG context for custom agent: {participant_name}")
            CustomAgentFactory.update_agent_context(
                agent_info["agent_data"],
                user_content
            )

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
        logger.info(f"Sending to {participant_name}: {user_content}")

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

        logger.info(f"{participant_name} responded: {response_text[:100]}...")

        # Generate audio for the AI response
        audio_url = None
        try:
            audio_url = tts_service.generate_speech(response_text.strip(), participant_id)
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

    async def generate_figure_turn(self, session_id: str) -> Dict:
        """Generate the next turn in a figure-vs-figure debate."""
        session_data = self.debate_sessions.get(session_id)
        if not session_data:
            raise ValueError(f"Session {session_id} not found")

        if session_data.get("mode") != "figure-vs-figure":
            raise ValueError("This method is only for figure-vs-figure debates")

        # Check if debate has reached max turns
        max_turns = session_data.get("max_turns", 10)
        messages = session_data["messages"]
        current_message_count = len(messages)

        # max_turns represents exchanges, so max messages = max_turns * 2
        max_messages = max_turns * 2

        if current_message_count >= max_messages:
            raise ValueError(f"Debate has reached maximum turns ({max_turns} exchanges = {max_messages} messages)")

        agents = session_data["agents"]
        current_speaker_idx = session_data["current_speaker"]
        current_agent = agents[current_speaker_idx]
        opponent_idx = 1 - current_speaker_idx
        opponent_agent = agents[opponent_idx]

        topic = session_data["topic"]

        # Build context from previous messages
        context = ""
        if messages:
            last_message = messages[-1]
            context = f"\n\nYour opponent ({opponent_agent['name']}) just said: {last_message['content']}\n\nPlease respond to their argument."
        else:
            context = f"\n\nYou are debating against {opponent_agent['name']}. Please make your opening statement."

        # Create prompt for current speaker
        prompt = f"""You are debating the topic: '{topic}'{context}

Please present your argument. Stay in character and engage directly with the topic and any previous points made."""

        # Create message content
        new_message = types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )

        # Get AI response
        response_text = ""
        runner = current_agent["runner"]

        # Update RAG context if custom agent
        if current_agent.get("is_custom") and "agent_data" in current_agent["info"]:
            logger.info(f"Updating RAG context for custom agent: {current_agent['name']}")
            CustomAgentFactory.update_agent_context(
                current_agent["info"]["agent_data"],
                prompt
            )

        logger.info(f"{current_agent['name']} is generating response...")

        async for event in runner.run_async(
            user_id=self.USER_ID,
            session_id=session_id,
            new_message=new_message
        ):
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            response_text += part.text
            elif hasattr(event, 'text') and event.text:
                response_text += event.text

        logger.info(f"{current_agent['name']} responded: {response_text[:100]}...")

        # Generate audio for the response
        audio_url = None
        try:
            audio_url = tts_service.generate_speech(response_text.strip(), current_agent["id"])
            logger.info(f"Generated audio URL: {audio_url}")
        except Exception as e:
            logger.error(f"Failed to generate audio: {e}")

        # Store the message
        message_data = {
            "id": str(uuid.uuid4()),
            "speaker_id": current_agent["id"],
            "speaker_name": current_agent["name"],
            "role": "participant",
            "content": response_text.strip(),
            "timestamp": datetime.now().isoformat(),
            "turn_number": len(messages) + 1,
            "audio_url": audio_url
        }
        session_data["messages"].append(message_data)

        # Switch to the other speaker for next turn
        session_data["current_speaker"] = opponent_idx

        return message_data

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
