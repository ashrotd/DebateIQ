"""
Text-to-Speech service for generating AI voices for debate participants.
Uses Google Cloud Text-to-Speech API.
"""
import os
import hashlib
from pathlib import Path
from typing import Optional
from google.cloud import texttospeech
from google.oauth2 import service_account
import logging

logger = logging.getLogger(__name__)


class TTSService:
    """Text-to-Speech service for generating audio from text."""

    def __init__(self):
        """Initialize the TTS service."""
        self.client = None
        self._client_initialized = False
        # Create audio directory if it doesn't exist
        self.audio_dir = Path("app/static/audio")
        self.audio_dir.mkdir(parents=True, exist_ok=True)

        # Voice configurations for different figures
        self.voice_configs = {
            "lincoln": {
                "language_code": "en-US",
                "name": "en-US-Standard-D",  # Deep male voice
                "ssml_gender": texttospeech.SsmlVoiceGender.MALE,
                "speaking_rate": 0.95,  # Slightly slower, authoritative
                "pitch": -2.0  # Deeper pitch
            },
            "tesla": {
                "language_code": "en-US",
                "name": "en-US-Standard-B",  # Male voice with character
                "ssml_gender": texttospeech.SsmlVoiceGender.MALE,
                "speaking_rate": 1.1,  # Slightly faster, energetic
                "pitch": 0.0  # Normal pitch
            },
            "hitler": {
                "language_code": "en-US",
                "name": "en-US-Standard-J",  # Distinct male voice
                "ssml_gender": texttospeech.SsmlVoiceGender.MALE,
                "speaking_rate": 1.05,  # Normal to fast
                "pitch": 1.0  # Slightly higher
            },
            "moderator": {
                "language_code": "en-US",
                "name": "en-US-Standard-A",  # Neutral male voice
                "ssml_gender": texttospeech.SsmlVoiceGender.MALE,
                "speaking_rate": 1.0,
                "pitch": 0.0
            },
            "default": {
                "language_code": "en-US",
                "name": "en-US-Standard-C",  # Generic male voice
                "ssml_gender": texttospeech.SsmlVoiceGender.MALE,
                "speaking_rate": 1.0,
                "pitch": 0.0
            }
        }

    def _initialize_client(self):
        """Lazy initialization of the TTS client."""
        if not self._client_initialized:
            try:
                # Try to get credentials from environment or service account file
                credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

                if credentials_path and os.path.exists(credentials_path):
                    # Use service account credentials from file
                    credentials = service_account.Credentials.from_service_account_file(
                        credentials_path
                    )
                    self.client = texttospeech.TextToSpeechClient(credentials=credentials)
                    logger.info("Google Cloud TTS client initialized with service account")
                else:
                    # Try default credentials (ADC)
                    self.client = texttospeech.TextToSpeechClient()
                    logger.info("Google Cloud TTS client initialized with default credentials")

                self._client_initialized = True
            except Exception as e:
                logger.error(f"Failed to initialize TTS client: {e}")
                logger.warning("TTS features will be disabled. See AI_VOICE_SETUP.md for setup instructions.")
                logger.info("You need a Google Cloud Service Account with Text-to-Speech API enabled.")
                self._client_initialized = True  # Don't retry every time
                self.client = None

    def _get_cache_filename(self, text: str, speaker_id: str) -> str:
        """Generate a cache filename based on text and speaker."""
        text_hash = hashlib.md5(f"{speaker_id}:{text}".encode()).hexdigest()
        return f"{speaker_id}_{text_hash}.mp3"

    def generate_speech(self, text: str, speaker_id: str) -> Optional[str]:
        """
        Generate speech audio for the given text and speaker.

        Args:
            text: The text to convert to speech
            speaker_id: The ID of the speaker (lincoln, tesla, hitler, moderator)

        Returns:
            Relative path to the generated audio file, or None if generation failed
        """
        try:
            # Initialize client if needed
            self._initialize_client()

            # If client initialization failed, return None
            if self.client is None:
                logger.warning("TTS client not available, skipping audio generation")
                return None

            # Check cache first
            cache_filename = self._get_cache_filename(text, speaker_id)
            cache_path = self.audio_dir / cache_filename

            if cache_path.exists():
                logger.info(f"Using cached audio for {speaker_id}")
                return f"/audio/{cache_filename}"

            # Get voice configuration
            voice_config = self.voice_configs.get(speaker_id, self.voice_configs["default"])

            # Set the text input to be synthesized
            synthesis_input = texttospeech.SynthesisInput(text=text)

            # Build the voice request
            voice = texttospeech.VoiceSelectionParams(
                language_code=voice_config["language_code"],
                name=voice_config["name"],
                ssml_gender=voice_config["ssml_gender"]
            )

            # Select the type of audio file
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=voice_config["speaking_rate"],
                pitch=voice_config["pitch"]
            )

            # Perform the text-to-speech request
            logger.info(f"Generating speech for {speaker_id}: {text[:50]}...")
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )

            # Save the audio to file
            with open(cache_path, "wb") as out:
                out.write(response.audio_content)
                logger.info(f"Audio saved to {cache_path}")

            return f"/audio/{cache_filename}"

        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return None

    def clear_cache(self):
        """Clear all cached audio files."""
        try:
            for file in self.audio_dir.glob("*.mp3"):
                file.unlink()
            logger.info("Audio cache cleared")
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


# Global TTS service instance
tts_service = TTSService()
