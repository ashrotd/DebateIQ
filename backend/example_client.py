"""
Example client script to test the DebateIQ multi-agent debate system.

This script demonstrates how to:
1. Create a debate session
2. Start the debate
3. Stream and display debate messages in real-time

Usage:
    python example_client.py
"""
import httpx
import json
import sys
from datetime import datetime

API_BASE_URL = "http://localhost:8000"


def create_debate(topic: str, participants: list, max_turns: int = 6):
    """Create a new debate session."""
    print(f"\n{'='*80}")
    print(f"Creating debate: '{topic}'")
    print(f"Participants: {', '.join(participants)}")
    print(f"Max turns: {max_turns}")
    print(f"{'='*80}\n")

    try:
        response = httpx.post(
            f"{API_BASE_URL}/api/v1/debates/",
            json={
                "topic": topic,
                "participants": participants,
                "max_turns": max_turns
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return data["session"]["id"]
    except Exception as e:
        print(f"Error creating debate: {e}")
        sys.exit(1)


def stream_debate(session_id: str):
    """Start and stream a debate session."""
    print(f"Starting debate session: {session_id}\n")
    print(f"{'='*80}\n")

    try:
        with httpx.stream(
            "POST",
            f"{API_BASE_URL}/api/v1/debates/{session_id}/start",
            timeout=300.0  # 5 minute timeout for long debates
        ) as response:
            response.raise_for_status()

            for line in response.iter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]  # Remove "data: " prefix
                    try:
                        data = json.loads(data_str)

                        if data.get("type") == "complete":
                            print(f"\n{'='*80}")
                            print(f"✓ {data.get('message', 'Debate completed')}")
                            print(f"{'='*80}\n")
                            break
                        elif data.get("type") == "error":
                            print(f"\n✗ Error: {data.get('message')}\n")
                            break
                        else:
                            # Format and display debate message
                            speaker = data.get("speaker_name", "Unknown")
                            content = data.get("content", "")
                            turn = data.get("turn_number", 0)
                            msg_type = data.get("message_type", "")

                            print(f"[Turn {turn}] {speaker} ({msg_type}):")
                            print(f"{'-'*80}")
                            print(f"{content}")
                            print(f"\n{'='*80}\n")

                    except json.JSONDecodeError:
                        continue

    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e.response.status_code} - {e.response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"Error streaming debate: {e}")
        sys.exit(1)


def main():
    """Main function to run example debate."""
    print("\n" + "="*80)
    print("DebateIQ - Multi-Agent Debate Example")
    print("="*80)

    # Example 1: Lincoln vs Tesla on AI regulation
    topic = "Should artificial intelligence be regulated by governments?"
    participants = ["lincoln", "tesla"]
    max_turns = 6

    # Create the debate
    session_id = create_debate(topic, participants, max_turns)

    print(f"✓ Debate session created successfully!")
    print(f"Session ID: {session_id}\n")

    # Start and stream the debate
    input("Press Enter to start the debate...")
    stream_debate(session_id)

    print("Debate completed! Check the full transcript above.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nDebate interrupted by user. Exiting...")
        sys.exit(0)
