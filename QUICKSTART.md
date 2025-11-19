# DebateIQ - Quick Start Guide

Get your multi-agent debate platform running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Google API Key (get free at [Google AI Studio](https://aistudio.google.com/app/apikey))

## Setup Steps

### 1. Configure API Key

```bash
# Navigate to backend directory
cd backend

# Create .env file from example
cp .env.example .env

# Edit .env and add your Google API key
# GOOGLE_API_KEY=your_actual_api_key_here
```

### 2. Start the Application

```bash
# From project root directory
docker-compose up --build
```

Wait for the services to start. You should see:
```
backend_1   | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend_1  | ➜  Local:   http://localhost:5173/
```

### 3. Test the Backend

Open your browser to:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 4. Create Your First Debate

Using the interactive API docs (http://localhost:8000/docs):

1. Navigate to `POST /api/v1/debates/`
2. Click "Try it out"
3. Use this example request:

```json
{
  "topic": "Should artificial intelligence be regulated?",
  "participants": ["lincoln", "tesla"],
  "max_turns": 6
}
```

4. Click "Execute"
5. Copy the `session_id` from the response

### 5. Start the Debate

1. Navigate to `POST /api/v1/debates/{session_id}/start`
2. Paste your session ID
3. Click "Try it out" then "Execute"
4. Watch the debate unfold in real-time!

## Example: Using curl

```bash
# Create a debate
curl -X POST http://localhost:8000/api/v1/debates/ \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Is technology making us more connected or isolated?",
    "participants": ["lincoln", "tesla", "hitler"],
    "max_turns": 8
  }'

# Copy the session_id from response, then start the debate
curl -N http://localhost:8000/api/v1/debates/YOUR_SESSION_ID/start
```

## Available Historical Figures

- **lincoln** - Abraham Lincoln (Democracy, Civil Rights)
- **tesla** - Nikola Tesla (Innovation, Technology)
- **hitler** - Adolf Hitler (Educational - Authoritarian Rhetoric)

## Debate Topics Ideas

Try these topics for interesting debates:

- "Should artificial intelligence be regulated?"
- "Is technology making us more connected or isolated?"
- "Can democracy survive in the age of social media?"
- "Should we prioritize innovation over safety?"
- "Is nationalism beneficial or harmful to society?"
- "Can scientific progress solve social problems?"

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│   FastAPI    │─────▶│  Google ADK     │
│  (React)    │      │   Backend    │      │  Multi-Agents   │
│  Port 5173  │◀─────│   Port 8000  │◀─────│  + Gemini API   │
└─────────────┘      └──────────────┘      └─────────────────┘
```

## Troubleshooting

### "Connection refused" error
- Ensure Docker containers are running: `docker ps`
- Check if ports 8000 and 5173 are available

### "Invalid API key" error
- Verify your Google API key in `backend/.env`
- Get a new key at https://aistudio.google.com/app/apikey
- Restart containers: `docker-compose restart`

### Debate not starting
- Check backend logs: `docker-compose logs backend`
- Verify session exists: `GET /api/v1/debates/{session_id}`
- Ensure session status is "waiting" (not "active" or "completed")

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs for full API documentation
2. **Read the ADK Guide**: Check `backend/README_ADK.md` for detailed documentation
3. **Customize Agents**: Modify agent personalities in `backend/app/agents/`
4. **Add New Figures**: Follow the guide in README_ADK.md to add more historical figures
5. **Integrate Frontend**: Connect your React frontend to display debates in the UI

## Development Mode

### Backend only (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
DebateIQ/
├── backend/
│   ├── app/
│   │   ├── agents/          # ADK agent implementations
│   │   ├── api/routes/      # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── main.py          # FastAPI app
│   │   └── config.py        # Configuration
│   ├── requirements.txt
│   ├── .env.example
│   └── README_ADK.md        # Detailed documentation
├── frontend/
│   └── src/
├── docker-compose.yml
└── QUICKSTART.md           # This file
```

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/debates/` | Create new debate |
| GET | `/api/v1/debates/` | List all debates |
| GET | `/api/v1/debates/{id}` | Get debate details |
| POST | `/api/v1/debates/{id}/start` | Start debate (SSE stream) |
| DELETE | `/api/v1/debates/{id}` | Delete debate |
| WebSocket | `/ws/debates/{id}` | Real-time debate updates |

## Support

For detailed documentation, see:
- Backend ADK Integration: [backend/README_ADK.md](backend/README_ADK.md)
- Google ADK Docs: https://google.github.io/adk-docs/
- FastAPI Docs: https://fastapi.tiangolo.com/

Happy Debating! 🎭
