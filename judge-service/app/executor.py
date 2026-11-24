import os
import subprocess
import tempfile
import time
from typing import Dict, List, Tuple
from app.config import settings
from app.schemas import ExecutionSummary, TestCasePayload


def normalize_output(output: str) -> str:
    """Normalize stdout by trimming trailing whitespace on each line and overall."""
    lines = [line.rstrip() for line in output.strip().splitlines()]
    return "\n".join(lines)


def _prepare_source_and_command(
    workdir: str, language: str, source_code: str
) -> Tuple[List[str] | None, List[str]]:
    """
    Writes source_code to a file in workdir and returns:
      (compile_command_or_None, run_command)
    """
    if language == "python":
        src_path = os.path.join(workdir, "solution.py")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)
        return None, ["python3", "-I", src_path]

    if language in ("javascript", "typescript"):
        src_path = os.path.join(workdir, "solution.js")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)
        return None, ["node", src_path]

    if language == "cpp":
        src_path = os.path.join(workdir, "solution.cpp")
        bin_path = os.path.join(workdir, "solution.out")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)
        compile_cmd = ["g++", "-O2", "-std=c++17", src_path, "-o", bin_path]
        return compile_cmd, [bin_path]

    if language == "c":
        src_path = os.path.join(workdir, "solution.c")
        bin_path = os.path.join(workdir, "solution.out")
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source_code)
        compile_cmd = ["gcc", "-O2", src_path, "-o", bin_path]
        return compile_cmd, [bin_path]

    raise ValueError(f"Unsupported language: {language}")


def _wrap_in_docker_if_enabled(workdir: str, cmd: List[str]) -> List[str]:
    """If USE_DOCKER_SANDBOX=true, wrap the command in an isolated Docker container."""
    if not settings.USE_DOCKER_SANDBOX:
        return cmd

    container_cmd = [arg.replace(workdir, "/workspace") for arg in cmd]
    return [
        "docker",
        "run",
        "--rm",
        "-i",
        "--network",
        "none",
        "--memory",
        f"{settings.MEMORY_LIMIT_MB}m",
        "--cpus",
        "0.5",
        "--pids-limit",
        "64",
        "-v",
        f"{workdir}:/workspace:rw",
        "-w",
        "/workspace",
        settings.RUNNER_DOCKER_IMAGE,
        *container_cmd,
    ]


def evaluate_submission_code(
    language: str, source_code: str, test_cases: List[Dict]
) -> ExecutionSummary:
    """
    Compiles once (if compiled language) and executes source_code against all test_cases
    inside an isolated temporary directory (or Docker sandbox container).
    Stops early on the first failing test case.
    """
    parsed_cases = [TestCasePayload(**tc) for tc in test_cases]

    if not parsed_cases:
        return ExecutionSummary(
            status="COMPLETED",
            verdict="ACCEPTED",
            execution_time_ms=0,
            memory_used_kb=0,
            details="No test cases configured for this problem",
        )

    with tempfile.TemporaryDirectory(prefix="runivo_exec_") as workdir:
        if settings.USE_DOCKER_SANDBOX:
            os.chmod(workdir, 0o777)

        try:
            compile_cmd, run_cmd = _prepare_source_and_command(
                workdir, language, source_code
            )
        except ValueError as err:
            return ExecutionSummary(
                status="COMPLETED",
                verdict="INTERNAL_ERROR",
                execution_time_ms=0,
                memory_used_kb=0,
                details=str(err),
            )

        # Step 1: Compile once if needed (C / C++)
        if compile_cmd is not None:
            effective_compile_cmd = _wrap_in_docker_if_enabled(
                workdir, compile_cmd
            )
            try:
                compile_proc = subprocess.run(
                    effective_compile_cmd,
                    cwd=workdir,
                    capture_output=True,
                    text=True,
                    timeout=settings.COMPILE_TIMEOUT_SECONDS,
                )
                if compile_proc.returncode != 0:
                    return ExecutionSummary(
                        status="COMPLETED",
                        verdict="COMPILATION_ERROR",
                        execution_time_ms=0,
                        memory_used_kb=0,
                        details=compile_proc.stderr[:1000],
                    )
            except subprocess.TimeoutExpired:
                return ExecutionSummary(
                    status="COMPLETED",
                    verdict="COMPILATION_ERROR",
                    execution_time_ms=int(
                        settings.COMPILE_TIMEOUT_SECONDS * 1000
                    ),
                    memory_used_kb=0,
                    details="Compilation timed out",
                )
            except FileNotFoundError as err:
                return ExecutionSummary(
                    status="COMPLETED",
                    verdict="INTERNAL_ERROR",
                    execution_time_ms=0,
                    memory_used_kb=0,
                    details=f"Compiler not found: {err}",
                )

        # Step 2: Run each test case sequentially
        effective_run_cmd = _wrap_in_docker_if_enabled(workdir, run_cmd)
        max_time_ms = 0

        for idx, tc in enumerate(parsed_cases, start=1):
            start_ns = time.perf_counter_ns()
            try:
                proc = subprocess.run(
                    effective_run_cmd,
                    cwd=workdir,
                    input=tc.input_data,
                    capture_output=True,
                    text=True,
                    timeout=settings.TIME_LIMIT_SECONDS,
                    env={"PATH": os.environ.get("PATH", "/usr/bin:/bin")},
                )
                elapsed_ms = int((time.perf_counter_ns() - start_ns) / 1_000_000)
                max_time_ms = max(max_time_ms, elapsed_ms)

                if proc.returncode != 0:
                    return ExecutionSummary(
                        status="COMPLETED",
                        verdict="RUNTIME_ERROR",
                        execution_time_ms=max_time_ms,
                        memory_used_kb=0,
                        failed_test_case=idx,
                        details=proc.stderr[:1000],
                    )

                actual_output = normalize_output(proc.stdout)
                expected_output = normalize_output(tc.expected_output)

                if actual_output != expected_output:
                    return ExecutionSummary(
                        status="COMPLETED",
                        verdict="WRONG_ANSWER",
                        execution_time_ms=max_time_ms,
                        memory_used_kb=0,
                        failed_test_case=idx,
                        details=f"Failed on test case #{idx}",
                    )

            except subprocess.TimeoutExpired:
                limit_ms = int(settings.TIME_LIMIT_SECONDS * 1000)
                return ExecutionSummary(
                    status="COMPLETED",
                    verdict="TIME_LIMIT_EXCEEDED",
                    execution_time_ms=limit_ms,
                    memory_used_kb=0,
                    failed_test_case=idx,
                    details=f"Time limit exceeded on test case #{idx}",
                )
            except Exception as err:
                return ExecutionSummary(
                    status="COMPLETED",
                    verdict="INTERNAL_ERROR",
                    execution_time_ms=max_time_ms,
                    memory_used_kb=0,
                    failed_test_case=idx,
                    details=str(err),
                )

        return ExecutionSummary(
            status="COMPLETED",
            verdict="ACCEPTED",
            execution_time_ms=max_time_ms,
            memory_used_kb=0,
        )