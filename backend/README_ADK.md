# DebateIQ - Google ADK Multi-Agent Integration

This document explains the Google Agent Development Kit (ADK) integration for the DebateIQ multi-agent debate platform.

## Overview

DebateIQ uses Google's Agent Development Kit to create a multi-agent debate system where historical figures engage in AI-powered debates on various topics. The system consists of:

- **Historical Figure Agents**: Abraham Lincoln, Nikola Tesla, Adolf Hitler (educational context)
- **Moderator Agent**: Orchestrates debates and maintains productive dialogue
- **Debate Orchestrator**: Coordinates multi-agent interactions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│              WebSocket / SSE Connection                  │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                FastAPI Backend                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Debate Orchestrator Service               │  │
│  │  - Session Management                             │  │
│  │  - Turn-based Coordination                        │  │
│  │  - Message Streaming                              │  │
│  └───────────┬────────────────────────────┬──────────┘  │
│              │                            │              │
│  ┌───────────▼──────────┐    ┌───────────▼──────────┐  │
│  │   Moderator Agent    │    │  Historical Figures  │  │
│  │  (Google ADK)        │    │    (Google ADK)      │  │
│  │  - Opens debate      │    │  - Lincoln Agent     │  │
│  │  - Summarizes points │    │  - Tesla Agent       │  │
│  │  - Asks questions    │    │  - Hitler Agent      │  │
│  └──────────────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Google Gemini API    │
         │   (gemini-2.0-flash)   │
         └────────────────────────┘
```

## Setup Instructions

### 1. Get Google API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for use in the next step

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Google API key:

```env
GOOGLE_API_KEY=your_actual_google_api_key_here
APP_ENV=development
DEBUG=True
```

### 3. Install Dependencies

#### Option A: Using Docker (Recommended)

```bash
# From the project root
docker-compose up --build
```

#### Option B: Local Development

```bash
# Create virtual environment
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Verify Installation

Open your browser and navigate to:
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## API Endpoints

### Debate Management

#### Create a Debate Session
```http
POST /api/v1/debates/
Content-Type: application/json

{
  "topic": "Should artificial intelligence be regulated?",
  "participants": ["lincoln", "tesla"],
  "max_turns": 10
}
```

Response:
```json
{
  "session": {
    "id": "session-uuid",
    "topic": "Should artificial intelligence be regulated?",
    "participants": ["lincoln", "tesla"],
    "status": "waiting",
    "created_at": "2025-01-19T10:00:00",
    "current_turn": 0,
    "max_turns": 10
  },
  "message": "Debate session created successfully..."
}
```

#### Get Debate Session
```http
GET /api/v1/debates/{session_id}
```

#### List All Debates
```http
GET /api/v1/debates/
```

#### Start Debate (Server-Sent Events)
```http
POST /api/v1/debates/{session_id}/start
```

Returns a stream of debate messages in SSE format:
```
data: {"speaker_name": "Moderator", "content": "Welcome...", ...}

data: {"speaker_name": "Abraham Lincoln", "content": "My fellow debaters...", ...}

data: {"type": "complete", "message": "Debate completed"}
```

#### Delete Debate
```http
DELETE /api/v1/debates/{session_id}
```

### WebSocket Streaming

Connect to real-time debate updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/debates/{session_id}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.type) {
    case 'debate_message':
      console.log(`${data.speaker_name}: ${data.content}`);
      break;
    case 'status':
      console.log(`Status: ${data.message}`);
      break;
    case 'complete':
      console.log('Debate completed!');
      break;
    case 'error':
      console.error(`Error: ${data.message}`);
      break;
  }
};
```

## Agent Descriptions

### Abraham Lincoln Agent
- **Personality**: Eloquent, humble, morally-driven
- **Expertise**: Democracy, civil rights, unity, constitutional law
- **Style**: Tells stories, uses metaphors, appeals to shared values
- **Historical Context**: 16th President, Civil War, Emancipation Proclamation

### Nikola Tesla Agent
- **Personality**: Visionary, intense, technically brilliant
- **Expertise**: Innovation, electrical engineering, future technology
- **Style**: Uses scientific evidence, challenges conventions, paints vivid futures
- **Historical Context**: AC electricity, wireless power, radio technology

### Adolf Hitler Agent (Educational Context)
- **Purpose**: Educational demonstration of authoritarian rhetoric
- **Personality**: Emotionally charged, manipulative, authoritarian
- **Expertise**: Propaganda techniques, scapegoating, authoritarian thinking
- **Educational Goal**: Help audiences recognize and counter dangerous rhetoric
- **Important**: Designed to be challenged and debunked by other agents

### Moderator Agent
- **Role**: Facilitates fair and productive debate
- **Responsibilities**:
  - Opens and closes debates
  - Ensures equal speaking time
  - Asks clarifying questions
  - Summarizes key points
  - Maintains respectful dialogue

## Debate Flow

1. **Session Creation**: Client creates debate with topic and participants
2. **Opening**: Moderator introduces topic and participants
3. **Main Arguments** (Turns 1-3):
   - Each participant presents opening statements
   - Responds to previous arguments
4. **Cross-examination** (Turns 4-7):
   - Participants challenge each other
   - Moderator provides periodic summaries
5. **Closing Statements** (Final turns):
   - Each participant makes final arguments
   - Moderator provides comprehensive summary

## Message Types

- `opening`: Initial position statements
- `argument`: Main debate arguments
- `rebuttal`: Responses to opposing arguments
- `closing`: Final statements
- `question`: Clarifying questions
- `answer`: Responses to questions
- `moderator`: Moderator interventions and summaries

## Development

### Project Structure

```
backend/
├── app/
│   ├── agents/               # ADK Agent implementations
│   │   ├── lincoln_agent/
│   │   │   ├── __init__.py
│   │   │   └── agent.py
│   │   ├── tesla_agent/
│   │   ├── hitler_agent/
│   │   └── moderator_agent/
│   ├── api/
│   │   └── routes/
│   │       ├── debates.py    # REST API endpoints
│   │       └── websocket.py  # WebSocket endpoints
│   ├── services/
│   │   └── debate_orchestrator.py  # Multi-agent coordination
│   ├── config.py             # Configuration management
│   ├── models.py             # Pydantic data models
│   └── main.py               # FastAPI application
├── requirements.txt
├── Dockerfile
└── .env.example
```

### Adding New Agents

To add a new historical figure:

1. Create agent directory: `app/agents/figure_name_agent/`
2. Implement `agent.py` with personality and system prompt
3. Register in `debate_orchestrator.py` agent_map
4. Update `FigureId` enum in `models.py`
5. Add to `/api/v1/figures` endpoint

### Customizing Debate Logic

Edit `app/services/debate_orchestrator.py`:
- Modify turn structure in `start_debate()`
- Adjust context building in `_build_context()`
- Change moderator intervention frequency
- Customize message types for different debate phases

## Testing

### Manual Testing with curl

```bash
# Create a debate
curl -X POST http://localhost:8000/api/v1/debates/ \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Is technology making us more connected or more isolated?",
    "participants": ["lincoln", "tesla"],
    "max_turns": 6
  }'

# Start debate (SSE stream)
curl -N http://localhost:8000/api/v1/debates/{session_id}/start
```

### Testing WebSocket

Use a WebSocket client tool or browser console:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/debates/{session_id}');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Troubleshooting

### "GOOGLE_API_KEY not found"
- Ensure `.env` file exists in `backend/` directory
- Verify `GOOGLE_API_KEY` is set correctly
- Restart the backend server after changing `.env`

### "Agent response timeout"
- Check internet connectivity to Google Gemini API
- Verify API key has sufficient quota
- Consider increasing timeout in agent configuration

### WebSocket connection fails
- Ensure CORS is properly configured for your frontend domain
- Check that WebSocket connections are allowed through firewall
- Verify session exists before connecting

### Debate not streaming
- Check that session status is "waiting" before starting
- Ensure only one debate stream per session
- Monitor backend logs for agent errors

## Performance Considerations

- **API Rate Limits**: Google Gemini API has rate limits; adjust `max_turns` accordingly
- **Streaming**: Use WebSocket for better performance with long debates
- **Caching**: Consider caching debate sessions in Redis for production
- **Database**: Add PostgreSQL for persistent storage of debates

## Security Notes

- Never commit `.env` file with real API keys
- Use environment variables in production
- Implement authentication for production deployment
- Rate limit API endpoints to prevent abuse
- Monitor API usage and costs

## Future Enhancements

- [ ] Add more historical figures
- [ ] Implement user authentication
- [ ] Add voting system for debate winners
- [ ] Store debates in database
- [ ] Add audio/video avatars for agents
- [ ] Implement debate rooms for multiple simultaneous debates
- [ ] Add analytics and debate insights
- [ ] Support custom agent creation by users

## Resources

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [Google ADK Python GitHub](https://github.com/google/adk-python)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://ai.google.dev/)

## License

See main project LICENSE file.
