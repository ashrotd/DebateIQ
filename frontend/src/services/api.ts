import {
  Figure,
  CreateDebateRequest,
  CreateDebateResponse,
  DebateSession,
  DebateMessage,
  StreamedDebateMessage,
  CreateCustomFigureRequest,
  CustomFigureResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/test`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getFigures(): Promise<Figure[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/figures`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.figures;
    } catch (error) {
      console.error('Failed to fetch figures:', error);
      throw error;
    }
  }

  // Custom Figure Management Methods

  async createCustomFigure(request: CreateCustomFigureRequest): Promise<CustomFigureResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/figures/custom/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create custom figure:', error);
      throw error;
    }
  }

  async listCustomFigures(): Promise<Figure[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/figures/custom/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to list custom figures:', error);
      throw error;
    }
  }

  async deleteCustomFigure(figureId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/figures/custom/${figureId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete custom figure:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  // Debate Management Methods

  async createDebate(request: CreateDebateRequest): Promise<CreateDebateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/debates/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create debate:', error);
      throw error;
    }
  }

  async getDebateSession(sessionId: string): Promise<DebateSession> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/debates/${sessionId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch debate session:', error);
      throw error;
    }
  }

  async listDebates(): Promise<DebateSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/debates/`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to list debates:', error);
      throw error;
    }
  }

  async deleteDebate(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/debates/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to delete debate:', error);
      throw error;
    }
  }

  // Send user message to debate and get AI response
  async sendUserMessage(sessionId: string, content: string): Promise<{
    user_message: { content: string; timestamp: string };
    ai_response: { id: string; speaker_name: string; content: string; timestamp: string };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/debates/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send user message:', error);
      throw error;
    }
  }

  // Stream debate messages using Server-Sent Events (SSE)
  streamDebate(
    sessionId: string,
    onMessage: (message: DebateMessage) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/v1/debates/${sessionId}/start`,
      { withCredentials: false }
    );

    eventSource.onmessage = (event) => {
      try {
        const data: StreamedDebateMessage = JSON.parse(event.data);

        if (data.type === 'complete') {
          onComplete();
          eventSource.close();
        } else if (data.type === 'error') {
          onError(data.message || 'Unknown error occurred');
          eventSource.close();
        } else if (data.type === 'debate_message') {
          // Convert StreamedDebateMessage to DebateMessage
          const message: DebateMessage = {
            id: data.id!,
            session_id: data.session_id!,
            speaker_id: data.speaker_id!,
            speaker_name: data.speaker_name!,
            role: data.role!,
            message_type: data.message_type!,
            content: data.content!,
            timestamp: data.timestamp!,
            turn_number: data.turn_number!,
          };
          onMessage(message);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
        onError('Failed to parse message from server');
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      onError('Connection error occurred');
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  // WebSocket connection for real-time debate (alternative to SSE)
  connectDebateWebSocket(
    sessionId: string,
    onMessage: (message: DebateMessage) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/ws/debates/${sessionId}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: StreamedDebateMessage = JSON.parse(event.data);

        if (data.type === 'complete') {
          onComplete();
          ws.close();
        } else if (data.type === 'error') {
          onError(data.message || 'Unknown error occurred');
          ws.close();
        } else if (data.type === 'debate_message') {
          const message: DebateMessage = {
            id: data.id!,
            session_id: data.session_id!,
            speaker_id: data.speaker_id!,
            speaker_name: data.speaker_name!,
            role: data.role!,
            message_type: data.message_type!,
            content: data.content!,
            timestamp: data.timestamp!,
            turn_number: data.turn_number!,
          };
          onMessage(message);
        } else if (data.type === 'status') {
          console.log('Status:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        onError('Failed to parse message from server');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return ws;
  }
}

export const apiService = new ApiService();
export default apiService;