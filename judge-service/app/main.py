from fastapi import FastAPI, HTTPException, status
from kombu.exceptions import OperationalError
from app.schemas import EvaluateRequest, EvaluateResponse
from app.tasks import evaluate_submission_task

app = FastAPI(
    title="Runivo Judge Service",
    description="Asynchronous code evaluation microservice using FastAPI, Redis, Celery, and Docker Sandbox",
    version="1.0.0",
)


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "success",
        "service": "judge-service",
        "message": "Judge service is running",
    }


@app.post(
    "/api/v1/evaluate",
    response_model=EvaluateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_evaluation(request: EvaluateRequest):
    """
    Receives a submission + test cases from the Node.js backend,
    pushes the job into the Redis/Celery queue, and immediately returns 202 Accepted.
    """
    try:
        async_result = evaluate_submission_task.delay(
            submission_id=request.submission_id,
            problem_id=request.problem_id,
            language=request.language,
            source_code=request.source_code,
            test_cases=[tc.model_dump() for tc in request.test_cases],
        )
    except OperationalError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cannot connect to Redis broker on localhost:6379. Run 'docker compose up -d' from the project root.",
        ) from exc

    return EvaluateResponse(
        status="queued",
        submission_id=request.submission_id,
        task_id=str(async_result.id),
        message="Submission queued for evaluation",
    )
