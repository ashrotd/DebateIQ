"""
Dynamic Agent Factory with RAG support for custom historical figures.
Creates debate agents on-the-fly using Wikipedia knowledge.
"""
from typing import List, Optional, Dict
from langchain_community.document_loaders import WikipediaLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google.adk.agents.llm_agent import Agent
from app.config import settings
import os
import logging

logger = logging.getLogger(__name__)


class RAGKnowledgeBase:
    """Build and manage RAG knowledge base from Wikipedia."""

    @staticmethod
    def create(topic: str, related_topics: List[str] = None, load_max_docs: int = 2) -> Optional[FAISS]:
        """
        Create a RAG vectorstore from Wikipedia.

        Args:
            topic: Main Wikipedia topic (e.g., "King Mahendra of Nepal")
            related_topics: Optional list of related topics
            load_max_docs: Max documents to load per topic

        Returns:
            FAISS vectorstore or None if failed
        """
        logger.info(f"Building RAG knowledge base for: {topic}")

        if related_topics is None:
            related_topics = []

        all_topics = [topic] + related_topics
        all_docs = []

        # Load from Wikipedia
        for t in all_topics:
            try:
                loader = WikipediaLoader(query=t, load_max_docs=load_max_docs)
                docs = loader.load()
                all_docs.extend(docs)
                logger.info(f"✓ Loaded Wikipedia docs for: {t}")
            except Exception as e:
                logger.warning(f"✗ Failed to load {t}: {e}")

        if not all_docs:
            logger.error(f"No Wikipedia documents found for {topic}")
            return None

        # Split and embed
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        splits = splitter.split_documents(all_docs)

        embeddings = HuggingFaceEmbeddings()
        vectorstore = FAISS.from_documents(splits, embeddings)

        logger.info(f"✅ RAG knowledge base created: {len(splits)} chunks indexed")
        return vectorstore


class CustomAgentFactory:
    """Factory for creating custom historical figure agents with RAG."""

    @staticmethod
    def validate_figure(topic: str) -> bool:
        """
        Validate if a historical figure exists on Wikipedia.

        Args:
            topic: Wikipedia topic to validate

        Returns:
            True if figure is well-known (found on Wikipedia)
        """
        try:
            loader = WikipediaLoader(query=topic, load_max_docs=1)
            docs = loader.load()
            return len(docs) > 0
        except Exception as e:
            logger.warning(f"Validation failed for {topic}: {e}")
            return False

    @staticmethod
    def create_agent(
        figure_name: str,
        figure_id: str,
        topic: str,
        related_topics: List[str] = None,
        specialty: str = None
    ) -> Dict:
        """
        Create a custom historical figure agent with RAG knowledge.

        Args:
            figure_name: Display name of the figure
            figure_id: Unique identifier (slug)
            topic: Main Wikipedia topic
            related_topics: Related Wikipedia topics for context
            specialty: Brief description of their expertise

        Returns:
            Dict with agent, vectorstore, and metadata
        """
        logger.info(f"Creating custom agent for {figure_name}")

        # Build RAG knowledge base
        vectorstore = RAGKnowledgeBase.create(topic, related_topics)
        if not vectorstore:
            raise ValueError(f"Could not build knowledge base for {figure_name}")

        # Create system prompt
        system_prompt = f"""You are {figure_name}, a historical figure.

PERSONALITY & SPEAKING STYLE:
- Speak authentically based on your historical knowledge and context
- Use language and expressions appropriate to your era
- Reference your life experiences and historical events you witnessed
- Show your unique perspective shaped by your time and circumstances

EXPERTISE:
{f'- {specialty}' if specialty else '- Discuss topics from your historical perspective'}

KNOWLEDGE BASE:
You have access to historical information about yourself and your era through the context provided.
Use this information to answer questions accurately and stay in character.

When provided with context:
{{context}}

DEBATE STYLE:
- Stay in character as {figure_name}
- Reference your historical experiences and the era you lived in
- Apply your knowledge and principles to the debate topic
- Engage respectfully with other debaters
- Use reasoning and examples from your time period

Always respond as {figure_name} would, drawing from the historical context provided.
"""

        # Set API key for Google ADK
        os.environ['GOOGLE_API_KEY'] = settings.google_api_key

        # Create agent
        agent = Agent(
            model=settings.gemini_model,
            name=figure_id,
            instruction=system_prompt,
            tools=[]
        )

        logger.info(f"✅ Custom agent created: {figure_name}")

        return {
            "agent": agent,
            "vectorstore": vectorstore,
            "figure_name": figure_name,
            "figure_id": figure_id,
            "topic": topic,
            "related_topics": related_topics or [],
            "specialty": specialty or "Historical perspective",
            "system_prompt_template": system_prompt
        }

    @staticmethod
    def get_context_for_message(vectorstore: FAISS, message: str, k: int = 3) -> str:
        """
        Retrieve relevant context from vectorstore for a message.

        Args:
            vectorstore: FAISS vectorstore with knowledge
            message: User's message/query
            k: Number of relevant chunks to retrieve

        Returns:
            Concatenated context string
        """
        try:
            docs = vectorstore.similarity_search(message, k=k)
            context = "\n\n".join([doc.page_content for doc in docs])
            return context
        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return ""

    @staticmethod
    def update_agent_context(agent_data: Dict, message: str) -> str:
        """
        Update agent's instruction with relevant context for the message.

        Args:
            agent_data: Dict containing agent and vectorstore
            message: User's message

        Returns:
            Updated system prompt with context
        """
        context = CustomAgentFactory.get_context_for_message(
            agent_data["vectorstore"],
            message
        )

        # Update the agent's instruction with context
        base_prompt = agent_data["system_prompt_template"]
        updated_prompt = base_prompt.replace("{context}", context)

        agent_data["agent"].instruction = updated_prompt
        return updated_prompt
