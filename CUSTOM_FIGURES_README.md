# Custom Historical Figures with RAG - Implementation Guide

## Overview
This feature allows users to dynamically create custom historical figures for debates using Wikipedia knowledge and RAG (Retrieval Augmented Generation) technology.

## How It Works

### 1. User Creates a Custom Figure
- User provides: figure name, Wikipedia topic, related topics (optional)
- System validates the figure exists on Wikipedia
- If not found → rejects with error message
- If found → builds RAG knowledge base

### 2. RAG Knowledge Base Creation
- Loads Wikipedia articles for the main topic and related topics
- Splits content into chunks (1000 chars with 200 overlap)
- Creates embeddings using HuggingFace
- Stores in FAISS vectorstore for fast retrieval

### 3. Dynamic Agent Generation
- Creates a Google ADK Agent with custom personality
- Includes system prompt tailored to the historical figure
- Agent has access to RAG context for accurate responses

### 4. Debate with RAG Context
- When user sends a message, system retrieves relevant context from vectorstore
- Context is injected into agent's prompt
- Agent responds in character with historically accurate information

## Architecture

### Backend Components

#### 1. Custom Agent Factory (`backend/app/agents/custom_agent_factory.py`)
- `RAGKnowledgeBase.create()` - Builds vectorstore from Wikipedia
- `CustomAgentFactory.validate_figure()` - Checks if figure exists
- `CustomAgentFactory.create_agent()` - Creates agent with RAG
- `CustomAgentFactory.update_agent_context()` - Injects RAG context

#### 2. Figure Store (`backend/app/services/custom_figure_store.py`)
- Persists custom figure metadata to `app/data/custom_figures/figures.json`
- Caches agent instances in memory for performance
- Provides CRUD operations for custom figures

#### 3. API Routes (`backend/app/api/routes/custom_figures.py`)
- `POST /api/v1/figures/custom/` - Create new custom figure
- `GET /api/v1/figures/custom/` - List all custom figures
- `GET /api/v1/figures/custom/{id}` - Get specific figure
- `DELETE /api/v1/figures/custom/{id}` - Delete custom figure

#### 4. Debate Orchestrator (`backend/app/services/debate_orchestrator.py`)
- `_get_agent_info()` - Supports both default and custom agents
- `create_session()` - Works with custom agents
- `send_user_message()` - Updates RAG context before each response

### Frontend Components

#### 1. CreateCustomFigure (`frontend/src/components/CreateCustomFigure.tsx`)
- Form for creating custom figures
- Input fields: name, topic, related topics, specialty, era
- Validation and error handling
- Success feedback

#### 2. Updated App.tsx
- New "Create Custom Figure" button on main page
- Navigation between views
- Refreshes figure list after creation

#### 3. API Service (`frontend/src/services/api.ts`)
- `createCustomFigure()` - POST request to create figure
- `listCustomFigures()` - GET custom figures
- `deleteCustomFigure()` - DELETE custom figure

## Usage Example

### Creating King Mahendra Agent

**Frontend Input:**
```
Figure Name: King Mahendra
Wikipedia Topic: Mahendra of Nepal
Related Topics: Panchayat (Nepal), Kingdom of Nepal, Shah dynasty
Specialty: Nepalese monarchy, Panchayat system
Era: 1920-1972
```

**What Happens:**
1. System searches Wikipedia for "Mahendra of Nepal"
2. Loads 2 docs for main topic + 2 docs each for related topics
3. Creates 50+ chunks of text with embeddings
4. Builds FAISS vectorstore
5. Creates Google ADK agent with RAG capabilities
6. Saves to `app/data/custom_figures/figures.json`

**During Debate:**
```
User: "What was your view on the Panchayat system?"
```
1. Retrieves top 3 relevant chunks from vectorstore about Panchayat
2. Injects context into agent's prompt
3. Agent responds in character with accurate historical info

## API Endpoints

### Create Custom Figure
```http
POST /api/v1/figures/custom/
Content-Type: application/json

{
  "figure_name": "King Mahendra",
  "topic": "Mahendra of Nepal",
  "related_topics": ["Panchayat (Nepal)", "Kingdom of Nepal"],
  "specialty": "Nepalese monarchy",
  "era": "1920-1972"
}
```

**Success Response (200):**
```json
{
  "id": "king-mahendra",
  "name": "King Mahendra",
  "topic": "Mahendra of Nepal",
  "related_topics": ["Panchayat (Nepal)", "Kingdom of Nepal"],
  "specialty": "Nepalese monarchy",
  "era": "1920-1972",
  "is_custom": true,
  "message": "Custom figure 'King Mahendra' created successfully with RAG knowledge base."
}
```

**Error Response (404):**
```json
{
  "detail": "Could not find 'Unknown Person' on Wikipedia. Please verify the name is correct..."
}
```

### List All Figures (Including Custom)
```http
GET /api/v1/figures
```

Returns both default and custom figures with `is_custom` flag.

### Delete Custom Figure
```http
DELETE /api/v1/figures/custom/{figure_id}
```

## File Structure

```
backend/
├── app/
│   ├── agents/
│   │   ├── custom_agent_factory.py      # RAG & agent creation
│   │   └── King_Mahendra_agent/
│   │       └── agent.py                  # Example RAG agent
│   ├── api/routes/
│   │   └── custom_figures.py             # Custom figure endpoints
│   ├── services/
│   │   ├── custom_figure_store.py        # Persistence layer
│   │   └── debate_orchestrator.py        # Updated for custom agents
│   ├── data/custom_figures/
│   │   └── figures.json                  # Stored custom figures
│   └── models.py                         # Added custom figure models

frontend/
├── src/
│   ├── components/
│   │   └── CreateCustomFigure.tsx        # Creation UI
│   ├── services/
│   │   └── api.ts                        # Added custom figure APIs
│   ├── types/
│   │   └── index.ts                      # Added custom figure types
│   └── App.tsx                           # Updated with navigation
```

## Key Features

✅ **Wikipedia Validation** - Only allows well-known figures with Wikipedia articles
✅ **RAG Technology** - Uses retrieval augmented generation for accurate responses
✅ **Dynamic Agent Creation** - Generates agents on-the-fly with custom knowledge
✅ **Persistent Storage** - Saves custom figures to disk
✅ **In-Memory Caching** - Caches agent instances for performance
✅ **Context Injection** - Updates agent context based on user queries
✅ **Full CRUD Operations** - Create, read, update, delete custom figures
✅ **Seamless Integration** - Works alongside default figures
✅ **User-Friendly UI** - Simple form for creating custom figures

## Testing

### Test Creating a Custom Figure:
1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Click "Create Custom Figure"
4. Fill in the form with a historical figure (e.g., "Nelson Mandela")
5. System validates and creates the agent
6. Figure appears in the main selection

### Test Debating with Custom Figure:
1. Click "Start New Debate"
2. Select your custom figure
3. Enter a debate topic
4. Chat with the figure - notice how they use accurate historical context

## Dependencies

### Backend
- `langchain-community` - Wikipedia loader, FAISS vectorstore
- `sentence-transformers` - HuggingFace embeddings
- `faiss-cpu` or `faiss-gpu` - Vector similarity search
- `google-adk` - Google Agent Development Kit

### Frontend
- React + TypeScript
- Tailwind CSS (already configured)

## Future Enhancements

- [ ] Support for custom knowledge sources (PDFs, text files)
- [ ] Adjust RAG parameters (chunk size, retrieval count)
- [ ] Pre-cache popular historical figures
- [ ] Support for multiple languages
- [ ] Image/avatar generation for custom figures
- [ ] Export/import custom figures
- [ ] Community sharing of custom figures
