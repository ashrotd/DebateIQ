# DebateIQ Arena

A full-stack web application for debating with AI-powered historical figures. Built with React (frontend) and FastAPI (backend), containerized using Docker and orchestrated with Docker Compose.

## Features
- Interactive frontend UI with React and Tailwind CSS
- Backend API with FastAPI serving historical figures and status
- Dockerized development for both frontend and backend
- Live backend status and error handling in the UI
- Ready for future AI agent and debate logic integration

## Project Structure
```
DebateIQ/
├── backend/           # FastAPI backend (Python)
│   ├── app/           # Backend source code
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/          # React frontend (TypeScript)
│   ├── src/           # Frontend source code
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml # Multi-container orchestration
└── README.md          # Project documentation
```

## Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Run the app
```bash
# From the project root
# Build and start both frontend and backend

docker compose up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Development
- Edit frontend code in `frontend/src/`
- Edit backend code in `backend/app/`
- Changes are reflected live in Docker containers (with volumes mounted)

## Frontend Overview
- Built with React 18, TypeScript, Tailwind CSS, Vite
- Main UI in `frontend/src/App.tsx`
- Shows backend status, loads historical figures from API, displays error/loading states

## Backend Overview
- Built with FastAPI (Python)
- Serves `/api/v1/test` and `/api/v1/figures` endpoints
- See `backend/app/api/routes/` for API logic

## Customization & Next Steps
- Add new historical figures in backend
- Implement debate logic and AI agents
- Extend UI for chat/debate features

## Troubleshooting
- If frontend cannot connect to backend, check Docker logs and ensure both containers are running
- For local development, ensure Vite is running on `0.0.0.0:3000` and FastAPI on `0.0.0.0:8000`

## License
MIT
