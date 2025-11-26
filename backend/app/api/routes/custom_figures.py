"""
Custom Figures API Routes - Endpoints for creating and managing custom historical figures.
"""
from fastapi import APIRouter, HTTPException
from typing import List
import re
import logging

from app.models import CreateCustomFigureRequest, CustomFigureResponse
from app.agents.custom_agent_factory import CustomAgentFactory
from app.services.custom_figure_store import custom_figure_store

router = APIRouter(prefix="/api/v1/figures/custom", tags=["custom-figures"])
logger = logging.getLogger(__name__)


def generate_figure_id(figure_name: str) -> str:
    """
    Generate a valid Python identifier from the figure name.
    Must be compatible with Google ADK agent naming requirements.

    Args:
        figure_name: Display name of the figure

    Returns:
        Valid identifier (e.g., "King Mahendra" -> "king_mahendra")
    """
    # Convert to lowercase and replace spaces/special chars with underscores
    figure_id = re.sub(r'[^\w\s]', '', figure_name.lower())
    figure_id = re.sub(r'[\s]+', '_', figure_id)
    figure_id = figure_id.strip('_')

    # Ensure it starts with a letter or underscore (not a digit)
    if figure_id and figure_id[0].isdigit():
        figure_id = f'figure_{figure_id}'

    return figure_id


@router.post("/", response_model=CustomFigureResponse)
async def create_custom_figure(request: CreateCustomFigureRequest):
    """
    Create a new custom historical figure with RAG knowledge base.

    This endpoint:
    1. Validates the figure exists on Wikipedia
    2. Builds a RAG knowledge base from Wikipedia articles
    3. Creates a debate agent with the knowledge
    4. Stores the figure for future use

    Args:
        request: Custom figure creation request

    Returns:
        CustomFigureResponse with figure details

    Raises:
        HTTPException: If figure not found on Wikipedia or creation fails
    """
    try:
        logger.info(f"Creating custom figure: {request.figure_name}")

        # Generate figure ID
        figure_id = generate_figure_id(request.figure_name)

        # Check if figure already exists
        existing = custom_figure_store.get_figure(figure_id)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Figure '{request.figure_name}' already exists. Use the existing figure or choose a different name."
            )

        # Validate figure exists on Wikipedia
        logger.info(f"Validating Wikipedia existence for: {request.topic}")
        is_valid = CustomAgentFactory.validate_figure(request.topic)

        if not is_valid:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find '{request.topic}' on Wikipedia. Please verify the name is correct and the figure is well-known enough to have a Wikipedia article."
            )

        # Create agent with RAG
        logger.info(f"Building RAG knowledge base for: {request.figure_name}")
        agent_data = CustomAgentFactory.create_agent(
            figure_name=request.figure_name,
            figure_id=figure_id,
            topic=request.topic,
            related_topics=request.related_topics,
            specialty=request.specialty
        )

        # Register agent in runtime cache
        custom_figure_store.register_agent(figure_id, agent_data)

        # Store figure metadata
        figure_data = custom_figure_store.add_figure(
            figure_id=figure_id,
            figure_name=request.figure_name,
            topic=request.topic,
            related_topics=request.related_topics,
            specialty=request.specialty or "Historical perspective",
            era=request.era
        )

        logger.info(f"✅ Successfully created custom figure: {request.figure_name}")

        return CustomFigureResponse(
            id=figure_id,
            name=request.figure_name,
            topic=request.topic,
            related_topics=request.related_topics,
            specialty=request.specialty or "Historical perspective",
            era=request.era or "Historical Figure",
            is_custom=True,
            message=f"Custom figure '{request.figure_name}' created successfully with RAG knowledge base."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating custom figure: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create custom figure: {str(e)}"
        )


@router.get("/", response_model=List[dict])
async def list_custom_figures():
    """
    List all custom historical figures.

    Returns:
        List of custom figure metadata
    """
    try:
        figures = custom_figure_store.list_figures()
        return figures
    except Exception as e:
        logger.error(f"Error listing custom figures: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{figure_id}")
async def get_custom_figure(figure_id: str):
    """
    Get details of a specific custom figure.

    Args:
        figure_id: The figure ID

    Returns:
        Figure metadata

    Raises:
        HTTPException: If figure not found
    """
    figure = custom_figure_store.get_figure(figure_id)
    if not figure:
        raise HTTPException(
            status_code=404,
            detail=f"Custom figure '{figure_id}' not found"
        )
    return figure


@router.delete("/{figure_id}")
async def delete_custom_figure(figure_id: str):
    """
    Delete a custom historical figure.

    Args:
        figure_id: The figure ID to delete

    Returns:
        Success message

    Raises:
        HTTPException: If figure not found
    """
    success = custom_figure_store.delete_figure(figure_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Custom figure '{figure_id}' not found"
        )

    return {
        "message": f"Custom figure '{figure_id}' deleted successfully"
    }
