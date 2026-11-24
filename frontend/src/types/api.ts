export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type SupportedLanguage = 'python' | 'javascript' | 'cpp' | 'c';

export type SubmissionStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type SubmissionVerdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'INTERNAL_ERROR';

export interface PublicUser {
  id: number;
  username: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface TagItem {
  id: number;
  name: string;
}

export interface ProblemListItem {
  id: number;
  title: string;
  difficulty: Difficulty;
  created_at: string;
  tags: TagItem[];
}

export interface ProblemConstraint {
  id: number;
  constraint_text: string;
}

export interface ProblemExample {
  id: number;
  example_input: string;
  example_output: string;
  explanation: string | null;
  position: number;
}

export interface ProblemHint {
  id: number;
  hint_description: string;
  hint_level: number;
}

export interface ProblemTestCase {
  id: number;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
  position: number;
}

export interface ProblemDetail extends ProblemListItem {
  description: string;
  input_format: string | null;
  output_format: string | null;
  constraints: ProblemConstraint[];
  examples: ProblemExample[];
  hints: ProblemHint[];
  test_cases: ProblemTestCase[];
}

export interface BookmarkItem {
  user_id: number;
  problem_id: number;
  created_at: string;
  problem?: {
    id: number;
    title: string;
    difficulty: Difficulty;
  };
}

export interface NoteItem {
  id: number;
  user_id: number;
  problem_id: number;
  notes_description: string;
  updated_at: string;
  problem?: {
    id: number;
    title: string;
    difficulty: Difficulty;
  };
}

export interface SubmissionItem {
  id: number;
  problem_id: number;
  user_id: number;
  language: SupportedLanguage;
  status: SubmissionStatus;
  verdict: SubmissionVerdict | null;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
  created_at: string;
  completed_at: string | null;
  source_code?: string;
  problem?: {
    id: number;
    title: string;
    difficulty: Difficulty;
  };
  user?: {
    id: number;
    username: string;
  };
}
