FROM python:3.12-alpine

# Install C/C++ compilers and Node.js runtime for multi-language execution
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    nodejs

# Create an unprivileged user to execute untrusted code safely
RUN adduser -D -u 10001 runner

WORKDIR /workspace
RUN chown runner:runner /workspace

USER runner

CMD ["python3", "--version"]
