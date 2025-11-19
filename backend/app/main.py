"""
Historical Debate Arena - FastAPI Backend
Minimal starter version to test setup
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Historical Debate Arena API",
    description="AI-powered debate platform with historical figures",
    version="1.0.0"
)

# CORS middleware - allows frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://frontend:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - basic health check"""
    return {
        "message": "Historical Debate Arena API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker"""
    return {
        "status": "healthy",
        "service": "debate-api"
    }


@app.get("/api/v1/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "message": "Backend is working!",
        "frontend_can_call_me": True
    }


@app.get("/api/v1/figures")
async def list_figures():
    """List available historical figures"""
    return {
        "figures": [
            {
                "id": "lincoln",
                "name": "Abraham Lincoln",
                "title": "16th President of the United States",
                "era": "1809-1865",
                "specialty": "Democracy, Civil Rights, Unity",
                "image": "abraham.jpg"
            },
            {
                "id": "tesla",
                "name": "Nikola Tesla",
                "title": "Inventor and Electrical Engineer",
                "era": "1856-1943",
                "specialty": "Innovation, Science, Future Technology",
                "image": "nicola.jpg"
            },
            {
                "id": "hitler",
                "name": "Adolf Hitler",
                "title": "German Dictator (Historical Context Only)",
                "era": "1889-1945",
                "specialty": "Authoritarian Rhetoric, Propaganda",
                "image": "hitler.jpg",
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )