from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from app.config import settings
import os
import logging
from typing import Dict, List
import asyncio

logger = logging.getLogger(__name__)

# System prompt for the judge agent
JUDGE_SYSTEM_PROMPT = """You are an expert debate judge with deep knowledge of logic, rhetoric, and argumentation.

YOUR ROLE:
- Evaluate debate arguments objectively and fairly
- Assess the strength of reasoning and evidence
- Fact-check claims using web search when needed
- Assign scores based on multiple criteria
- Provide constructive feedback

EVALUATION CRITERIA (each scored 0-10):

1. **Logic & Reasoning** (0-10):
   - Are arguments logically sound?
   - Is the reasoning coherent and well-structured?
   - Are conclusions supported by premises?

2. **Factual Accuracy** (0-10):
   - Are claims factually correct?
   - Is evidence credible and verifiable?
   - Use web search to verify dubious claims

3. **Rhetorical Effectiveness** (0-10):
   - Is the argument persuasive?
   - Are rhetorical techniques used effectively?
   - Is the language clear and compelling?

4. **Relevance** (0-10):
   - Does the argument address the debate topic?
   - Are points on-topic and focused?
   - Is there unnecessary tangential discussion?

5. **Rebuttal Strength** (0-10):
   - Does the argument address opponent's points?
   - Are counter-arguments effective?
   - Is there engagement with opposing views?

INSTRUCTIONS:
1. When you encounter factual claims, use web search to verify them
2. Be objective - judge based on argument quality, not personal agreement
3. Provide specific examples from the arguments
4. Give constructive feedback for improvement
5. Return scores in a structured format

OUTPUT FORMAT:
For each argument evaluated, provide:
- Scores for each criterion (0-10)
- Total score (sum of all criteria, max 50)
- Brief reasoning for each score
- Fact-check results (if web search was used)
- Overall assessment and winner determination
"""


class DebateJudge:
    """Judge agent that evaluates debate arguments with fact-checking."""

    def __init__(self):
        """Initialize the debate judge agent with web search capability."""
        os.environ['GOOGLE_API_KEY'] = settings.google_api_key

        self.agent = LlmAgent(
            model=settings.gemini_model,
            name='debate_judge',
            instruction=JUDGE_SYSTEM_PROMPT,
            tools=[google_search] 
        )

        # Create session service and runner for the judge
        self.session_service = InMemorySessionService()
        self.runner = Runner(
            agent=self.agent,
            app_name="debate_judge",
            session_service=self.session_service
        )
        self.user_id = "judge_user"

        logger.info("Debate judge agent initialized with web search capability")

    async def evaluate_exchange(
        self,
        topic: str,
        user_argument: str,
        ai_argument: str,
        debate_context: List[Dict] = None
    ) -> Dict:
        logger.info(f"Evaluating debate exchange on topic: {topic}")

        context_text = ""
        if debate_context:
            context_text = "\n\nPREVIOUS EXCHANGES:\n"
            for i, exchange in enumerate(debate_context[-3:], 1):
                context_text += f"\nExchange {i}:\n"
                context_text += f"User: {exchange.get('user', 'N/A')}\n"
                context_text += f"AI: {exchange.get('ai', 'N/A')}\n"

        evaluation_prompt = f"""DEBATE TOPIC: {topic}

{context_text}

CURRENT EXCHANGE TO EVALUATE:

USER'S ARGUMENT:
{user_argument}

AI'S ARGUMENT:
{ai_argument}

TASK:
1. Evaluate BOTH arguments using the 5 criteria (Logic, Factual Accuracy, Rhetoric, Relevance, Rebuttal)
2. Use web search to fact-check any factual claims made by either side
3. Assign scores (0-10) for each criterion for both participants
4. Calculate total scores (max 50 points each)
5. Determine the winner of this exchange
6. Provide reasoning for your evaluation

Return your evaluation in this JSON structure:
{{
    "user_scores": {{
        "logic": <0-10>,
        "factual_accuracy": <0-10>,
        "rhetoric": <0-10>,
        "relevance": <0-10>,
        "rebuttal": <0-10>,
        "total": <sum>
    }},
    "ai_scores": {{
        "logic": <0-10>,
        "factual_accuracy": <0-10>,
        "rhetoric": <0-10>,
        "relevance": <0-10>,
        "rebuttal": <0-10>,
        "total": <sum>
    }},
    "fact_checks": [
        {{
            "claim": "<claim being checked>",
            "source": "<who made it: user or ai>",
            "verdict": "<true/false/partially true/uncertain>",
            "evidence": "<what web search found>"
        }}
    ],
    "reasoning": {{
        "user_analysis": "<detailed analysis of user's argument>",
        "ai_analysis": "<detailed analysis of AI's argument>",
        "key_strengths": "<notable strengths from either side>",
        "key_weaknesses": "<notable weaknesses from either side>"
    }},
    "winner": "<user/ai/tie>",
    "winner_reason": "<brief explanation of why this participant won>"
}}
"""

        try:
            import uuid
            session_id = f"judge_{uuid.uuid4().hex[:8]}"

            await self.session_service.create_session(
                app_name="debate_judge",
                user_id=self.user_id,
                session_id=session_id
            )

            # Create message content
            message = types.Content(
                role="user",
                parts=[types.Part(text=evaluation_prompt)]
            )

            response_text = ""

            async for event in self.runner.run_async(
                user_id=self.user_id,
                session_id=session_id,
                new_message=message
            ):
                # Extract text from events
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts'):
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                response_text += part.text
                elif hasattr(event, 'text') and event.text:
                    response_text += event.text

            logger.info("Judge evaluation completed")

            import json
            import re

            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                evaluation = json.loads(json_match.group())
            else:
                # Fallback if JSON parsing fails
                logger.warning("Could not parse JSON from judge response, using fallback")
                evaluation = {
                    "user_scores": {"total": 0},
                    "ai_scores": {"total": 0},
                    "fact_checks": [],
                    "reasoning": {"user_analysis": response_text},
                    "winner": "tie",
                    "winner_reason": "Could not determine winner"
                }

            return evaluation

        except Exception as e:
            logger.error(f"Error during judge evaluation: {e}", exc_info=True)
            return {
                "error": str(e),
                "user_scores": {"total": 0},
                "ai_scores": {"total": 0},
                "fact_checks": [],
                "reasoning": {"user_analysis": "Evaluation failed"},
                "winner": "tie",
                "winner_reason": "Evaluation error"
            }

    def get_cumulative_scores(self, evaluations: List[Dict]) -> Dict:
        """
        Calculate cumulative scores across multiple exchanges.

        Args:
            evaluations: List of evaluation results

        Returns:
            Dict with cumulative scores and overall winner
        """
        user_total = 0
        ai_total = 0

        for eval_result in evaluations:
            user_total += eval_result.get("user_scores", {}).get("total", 0)
            ai_total += eval_result.get("ai_scores", {}).get("total", 0)

        return {
            "user_cumulative_score": user_total,
            "ai_cumulative_score": ai_total,
            "overall_winner": "user" if user_total > ai_total else ("ai" if ai_total > user_total else "tie"),
            "score_difference": abs(user_total - ai_total),
            "exchanges_evaluated": len(evaluations)
        }


debate_judge = DebateJudge()
