
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problems (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    difficulty VARCHAR(10) NOT NULL
        CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problem_constraints (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id BIGINT NOT NULL
        REFERENCES problems(id) ON DELETE CASCADE,
    constraint_text TEXT NOT NULL
);

CREATE TABLE examples (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id BIGINT NOT NULL
        REFERENCES problems(id) ON DELETE CASCADE,
    example_input TEXT NOT NULL,
    example_output TEXT NOT NULL,
    explanation TEXT,
    position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE hints (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id BIGINT NOT NULL
        REFERENCES problems(id) ON DELETE CASCADE,
    hint_description TEXT NOT NULL,
    hint_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE test_cases (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id BIGINT NOT NULL
        REFERENCES problems(id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    problem_id BIGINT NOT NULL REFERENCES problems(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    source_code TEXT NOT NULL,
    language VARCHAR(30) NOT NULL DEFAULT 'python',
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN (
            'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'
        )),
    verdict VARCHAR(30)
        CHECK (verdict IN (
            'ACCEPTED', 'WRONG_ANSWER', 'RUNTIME_ERROR',
            'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR',
            'INTERNAL_ERROR'
        )),
    execution_time_ms INTEGER,
    memory_used_kb INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CHECK (
        status <> 'COMPLETED' OR verdict IS NOT NULL
    )
);

CREATE TABLE notes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id)
        ON DELETE CASCADE,
    notes_description TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, problem_id)
);

CREATE TABLE bookmarks (
    user_id BIGINT NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES problems(id)
        ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, problem_id)
);

CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE problem_tags (
    problem_id BIGINT NOT NULL REFERENCES problems(id)
        ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id)
        ON DELETE CASCADE,
    PRIMARY KEY (problem_id, tag_id)
);

-- Helpful indexes for common queries
CREATE INDEX idx_submissions_user_created
    ON submissions(user_id, created_at DESC);

CREATE INDEX idx_submissions_problem_user
    ON submissions(problem_id, user_id);

CREATE INDEX idx_test_cases_problem
    ON test_cases(problem_id, position);

CREATE INDEX idx_problem_tags_tag
    ON problem_tags(tag_id, problem_id);
