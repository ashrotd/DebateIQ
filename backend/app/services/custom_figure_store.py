"""
Persistence layer for custom historical figures.
Stores figure metadata and manages custom agent instances.
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class CustomFigureStore:
    """Store and manage custom historical figures."""

    def __init__(self, storage_dir: str = "app/data/custom_figures"):
        """
        Initialize the custom figure store.

        Args:
            storage_dir: Directory to store custom figure data
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.figures_file = self.storage_dir / "figures.json"
        self.custom_agents: Dict[str, Dict] = {}  # Runtime cache of agent instances

        # Load existing figures
        self._load_figures()

    def _load_figures(self):
        """Load custom figures from storage."""
        if self.figures_file.exists():
            try:
                with open(self.figures_file, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded {len(data)} custom figures from storage")
                    return data
            except Exception as e:
                logger.error(f"Error loading figures: {e}")
                return {}
        return {}

    def _save_figures(self, figures: Dict):
        """Save figures to storage."""
        try:
            with open(self.figures_file, 'w') as f:
                json.dump(figures, f, indent=2)
            logger.info(f"Saved {len(figures)} custom figures to storage")
        except Exception as e:
            logger.error(f"Error saving figures: {e}")
            raise

    def add_figure(
        self,
        figure_id: str,
        figure_name: str,
        topic: str,
        related_topics: List[str],
        specialty: str,
        era: Optional[str] = None
    ) -> Dict:
        """
        Add a new custom figure to the store.

        Args:
            figure_id: Unique identifier (slug)
            figure_name: Display name
            topic: Main Wikipedia topic
            related_topics: Related topics list
            specialty: Brief description
            era: Historical era (optional)

        Returns:
            Figure metadata dict
        """
        figures = self._load_figures()

        if figure_id in figures:
            raise ValueError(f"Figure with ID '{figure_id}' already exists")

        figure_data = {
            "id": figure_id,
            "name": figure_name,
            "topic": topic,
            "related_topics": related_topics,
            "specialty": specialty,
            "era": era or "Historical Figure",
            "is_custom": True,
            "created_at": str(Path(self.figures_file).stat().st_mtime) if self.figures_file.exists() else None
        }

        figures[figure_id] = figure_data
        self._save_figures(figures)

        logger.info(f"Added custom figure: {figure_name} ({figure_id})")
        return figure_data

    def get_figure(self, figure_id: str) -> Optional[Dict]:
        """Get a custom figure by ID."""
        figures = self._load_figures()
        return figures.get(figure_id)

    def list_figures(self) -> List[Dict]:
        """List all custom figures."""
        figures = self._load_figures()
        return list(figures.values())

    def delete_figure(self, figure_id: str) -> bool:
        """
        Delete a custom figure.

        Args:
            figure_id: Figure ID to delete

        Returns:
            True if deleted, False if not found
        """
        figures = self._load_figures()

        if figure_id not in figures:
            return False

        del figures[figure_id]
        self._save_figures(figures)

        # Remove from runtime cache
        if figure_id in self.custom_agents:
            del self.custom_agents[figure_id]

        logger.info(f"Deleted custom figure: {figure_id}")
        return True

    def register_agent(self, figure_id: str, agent_data: Dict):
        """
        Register a custom agent instance in runtime cache.

        Args:
            figure_id: Figure ID
            agent_data: Agent data from CustomAgentFactory
        """
        self.custom_agents[figure_id] = agent_data
        logger.info(f"Registered agent for figure: {figure_id}")

    def get_agent(self, figure_id: str) -> Optional[Dict]:
        """Get a cached agent instance."""
        return self.custom_agents.get(figure_id)

    def has_agent(self, figure_id: str) -> bool:
        """Check if agent is cached."""
        return figure_id in self.custom_agents


# Global store instance
custom_figure_store = CustomFigureStore()
