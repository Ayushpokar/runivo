import logging
from typing import Dict, List
import httpx
from app.celery_app import celery_app
from app.config import settings
from app.executor import evaluate_submission_code

logger = logging.getLogger(__name__)


def _notify_backend_status(submission_id: int, payload: Dict) -> None:
    """Calls Node.js PATCH /api/v1/submissions/:id/result with the submission status/verdict."""
    url = f"{settings.BACKEND_URL}/api/v1/submissions/{submission_id}/result"
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.patch(url, json=payload)
            response.raise_for_status()
    except Exception as exc:
        logger.error(
            "Failed to notify backend for submission %s: %s",
            submission_id,
            exc,
        )


@celery_app.task(name="judge.evaluate_submission", bind=True)
def evaluate_submission_task(
    self,
    submission_id: int,
    problem_id: int,
    language: str,
    source_code: str,
    test_cases: List[Dict],
) -> Dict:
    """
    Celery background task:
    1. Marks submission as RUNNING on the Node.js backend.
    2. Executes source_code against all test_cases in the sandbox/executor.
    3. Sends final COMPLETED verdict + execution_time_ms back to the Node.js backend.
    """
    logger.info(
        "Evaluating submission %s (problem=%s, language=%s, test_cases=%d)",
        submission_id,
        problem_id,
        language,
        len(test_cases),
    )

    # 1. Mark submission as RUNNING
    _notify_backend_status(submission_id, {"status": "RUNNING"})

    # 2. Execute code against test cases
    summary = evaluate_submission_code(
        language=language,
        source_code=source_code,
        test_cases=test_cases,
    )

    # 3. Report final verdict back to Node.js backend
    result_payload = {
        "status": summary.status,
        "verdict": summary.verdict,
        "execution_time_ms": summary.execution_time_ms,
        "memory_used_kb": summary.memory_used_kb,
    }
    _notify_backend_status(submission_id, result_payload)

    return summary.model_dump()
