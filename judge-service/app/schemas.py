from typing import List, Literal, Optional
from pydantic import BaseModel, Field

SupportedLanguage = Literal[
    "python",
    "javascript",
    "typescript",
    "cpp",
    "c",
]

VerdictType = Literal[
    "ACCEPTED",
    "WRONG_ANSWER",
    "RUNTIME_ERROR",
    "TIME_LIMIT_EXCEEDED",
    "COMPILATION_ERROR",
    "INTERNAL_ERROR",
]


class TestCasePayload(BaseModel):
    id: Optional[int] = None
    input_data: str
    expected_output: str
    position: int = 1


class EvaluateRequest(BaseModel):
    submission_id: int = Field(..., gt=0)
    problem_id: int = Field(..., gt=0)
    language: SupportedLanguage = "python"
    source_code: str = Field(..., min_length=1)
    test_cases: List[TestCasePayload] = Field(default_factory=list)


class EvaluateResponse(BaseModel):
    status: str = "queued"
    submission_id: int
    task_id: str
    message: str = "Submission queued for evaluation"


class ExecutionSummary(BaseModel):
    status: Literal["COMPLETED", "FAILED"]
    verdict: VerdictType
    execution_time_ms: int
    memory_used_kb: int
    failed_test_case: Optional[int] = None
    details: Optional[str] = None
