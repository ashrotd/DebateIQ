"""
ONE-LINE RAG - The Easiest Possible Setup
Just provide a name, it does everything else!
"""
from langchain_community.document_loaders import WikipediaLoader
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitters import RecursiveCharacterTextSplitter
from typing import List

class OneLinerRAG:
    """
    Stupidly simple RAG - just give it a Wikipedia topic name!
    """
    
    @staticmethod
    def create(topic: str, related_topics: List[str] = None):
        """
        Create a RAG system with ONE LINE!
        
        Args:
            topic: Main Wikipedia topic (e.g., "Mahendra of Nepal")
            related_topics: Optional list of related topics to include
        
        Returns:
            FAISS vectorstore ready to use
        """
        print(f"🚀 Building RAG for: {topic}")
        
        # Default related topics if none provided
        if related_topics is None:
            related_topics = []
        
        all_topics = [topic] + related_topics
        
        # Load from Wikipedia automatically
        print("📚 Loading from Wikipedia...")
        all_docs = []
        for t in all_topics:
            try:
                loader = WikipediaLoader(query=t, load_max_docs=2)
                docs = loader.load()
                all_docs.extend(docs)
                print(f"  ✓ Loaded: {t}")
            except Exception as e:
                print(f"  ✗ Failed: {t} ({e})")
        
        # Split and embed
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = splitter.split_documents(all_docs)
        
        embeddings = HuggingFaceEmbeddings()
        vectorstore = FAISS.from_documents(splits, embeddings)
        
        print(f"✅ Done! {len(splits)} chunks indexed.")
        return vectorstore


# ============================================
# USAGE EXAMPLES
# ============================================

# Example 1: Minimal - Just one line!
vectorstore = OneLinerRAG.create("Mahendra of Nepal")

# Example 2: With related topics
vectorstore = OneLinerRAG.create(
    "Mahendra of Nepal",
    related_topics=["Panchayat (Nepal)", "Kingdom of Nepal", "History of Nepal"]
)

# Example 3: Query it
docs = vectorstore.similarity_search("What was the Panchayat system?", k=3)
for doc in docs:
    print(doc.page_content[:200])


# ============================================
# COMPLETE AGENT WITH ONE-LINE RAG
# ============================================

class SuperEasyMahendraAgent:
    """Complete agent with automatic knowledge - literally 3 lines to setup!"""
    
    def __init__(self):
        # ONE LINE to build entire knowledge base!
        self.rag = OneLinerRAG.create(
            "Mahendra of Nepal",
            related_topics=[
                "Panchayat (Nepal)",
                "Kingdom of Nepal", 
                "Tribhuvan of Nepal",
                "Shah dynasty"
            ]
        )
        
        from google.adk.agents.llm_agent import Agent
        from app.config import settings
        import os
        
        os.environ['GOOGLE_API_KEY'] = settings.google_api_key
        
        self.base_prompt = """You are King Mahendra Bir Bikram Shah Dev of Nepal.
        
Use the following historical information to answer questions accurately:
{context}

Respond in character with royal dignity and authority."""
        
        self.agent = Agent(
            model=settings.gemini_model,
            name='king_mahendra',
            instruction=self.base_prompt.format(context=""),
            tools=[]
        )
    
    def chat(self, message: str) -> str:
        """Chat with King Mahendra!"""
        # Get context automatically
        docs = self.rag.similarity_search(message, k=3)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # Update prompt with context
        self.agent.instruction = self.base_prompt.format(context=context)
        
        # Generate response
        return self.agent.generate(message)
