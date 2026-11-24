import os


class Settings:
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:3000")
    TIME_LIMIT_SECONDS: float = float(os.getenv("TIME_LIMIT_SECONDS", "2.0"))
    COMPILE_TIMEOUT_SECONDS: float = float(
        os.getenv("COMPILE_TIMEOUT_SECONDS", "10.0")
    )
    MEMORY_LIMIT_MB: int = int(os.getenv("MEMORY_LIMIT_MB", "128"))
    USE_DOCKER_SANDBOX: bool = (
        os.getenv("USE_DOCKER_SANDBOX", "false").lower() == "true"
    )
    RUNNER_DOCKER_IMAGE: str = os.getenv(
        "RUNNER_DOCKER_IMAGE", "runivo-runner:latest"
    )


settings = Settings()
