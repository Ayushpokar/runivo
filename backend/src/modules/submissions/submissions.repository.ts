import prisma from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateSubmissionInput,
  ListSubmissionsQuery,
  UpdateSubmissionResultInput,
} from './submissions.schemas.js';

export interface SubmissionItem {
  id: number;
  problem_id: number;
  user_id: number;
  language: string;
  status: string;
  verdict: string | null;
  execution_time_ms: number | null;
  memory_used_kb: number | null;
  created_at: Date;
  completed_at: Date | null;
  problem?: {
    id: number;
    title: string;
    difficulty: string;
  };
  user?: {
    id: number;
    username: string;
  };
}

export interface SubmissionDetail extends SubmissionItem {
  source_code: string;
}

const submissionListSelect = {
  id: true,
  problem_id: true,
  user_id: true,
  language: true,
  status: true,
  verdict: true,
  execution_time_ms: true,
  memory_used_kb: true,
  created_at: true,
  completed_at: true,
  problems: {
    select: {
      id: true,
      title: true,
      difficulty: true,
    },
  },
  users: {
    select: {
      id: true,
      username: true,
    },
  },
} satisfies Prisma.submissionsSelect;

const submissionDetailSelect = {
  ...submissionListSelect,
  source_code: true,
} satisfies Prisma.submissionsSelect;

type SubmissionListRecord = Prisma.submissionsGetPayload<{
  select: typeof submissionListSelect;
}>;

type SubmissionDetailRecord = Prisma.submissionsGetPayload<{
  select: typeof submissionDetailSelect;
}>;

function mapSubmissionItem(record: SubmissionListRecord): SubmissionItem {
  return {
    id: Number(record.id),
    problem_id: Number(record.problem_id),
    user_id: Number(record.user_id),
    language: record.language,
    status: record.status,
    verdict: record.verdict,
    execution_time_ms: record.execution_time_ms,
    memory_used_kb: record.memory_used_kb,
    created_at: record.created_at,
    completed_at: record.completed_at,
    problem: {
      id: Number(record.problems.id),
      title: record.problems.title,
      difficulty: record.problems.difficulty,
    },
    user: {
      id: Number(record.users.id),
      username: record.users.username,
    },
  };
}

function mapSubmissionDetail(record: SubmissionDetailRecord): SubmissionDetail {
  return {
    ...mapSubmissionItem(record),
    source_code: record.source_code,
  };
}

export class SubmissionsRepository {
  async create(data: CreateSubmissionInput): Promise<SubmissionDetail> {
    const created = await prisma.submissions.create({
      data: {
        user_id: BigInt(data.user_id),
        problem_id: BigInt(data.problem_id),
        source_code: data.source_code,
        language: data.language,
        status: 'QUEUED',
      },
      select: submissionDetailSelect,
    });

    return mapSubmissionDetail(created);
  }

  async findById(id: bigint): Promise<SubmissionDetail | null> {
    const record = await prisma.submissions.findUnique({
      where: { id },
      select: submissionDetailSelect,
    });

    return record ? mapSubmissionDetail(record) : null;
  }

  async findMany(
    query: ListSubmissionsQuery
  ): Promise<{ items: SubmissionItem[]; total: number }> {
    const { page, limit, user_id, problem_id, status, verdict, language } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.submissionsWhereInput = {
      ...(user_id !== undefined ? { user_id: BigInt(user_id) } : {}),
      ...(problem_id !== undefined ? { problem_id: BigInt(problem_id) } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(verdict !== undefined ? { verdict } : {}),
      ...(language !== undefined ? { language } : {}),
    };

    const [records, total] = await prisma.$transaction([
      prisma.submissions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: submissionListSelect,
      }),
      prisma.submissions.count({ where }),
    ]);

    return {
      items: records.map(mapSubmissionItem),
      total,
    };
  }

  async findByUserId(userId: bigint): Promise<SubmissionItem[]> {
    const records = await prisma.submissions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: submissionListSelect,
    });

    return records.map(mapSubmissionItem);
  }

  async updateResult(
    id: bigint,
    data: UpdateSubmissionResultInput
  ): Promise<SubmissionDetail> {
    const isTerminal =
      data.status === 'COMPLETED' || data.status === 'FAILED';

    const updated = await prisma.submissions.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.verdict !== undefined ? { verdict: data.verdict } : {}),
        ...(data.execution_time_ms !== undefined
          ? { execution_time_ms: data.execution_time_ms }
          : {}),
        ...(data.memory_used_kb !== undefined
          ? { memory_used_kb: data.memory_used_kb }
          : {}),
        ...(isTerminal ? { completed_at: new Date() } : {}),
      },
      select: submissionDetailSelect,
    });

    return mapSubmissionDetail(updated);
  }

  async findTestCasesByProblemId(problemId: bigint): Promise<
    Array<{
      id: number;
      input_data: string;
      expected_output: string;
      position: number;
    }>
  > {
    const records = await prisma.test_cases.findMany({
      where: { problem_id: problemId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        input_data: true,
        expected_output: true,
        position: true,
      },
    });

    return records.map((tc) => ({
      id: Number(tc.id),
      input_data: tc.input_data,
      expected_output: tc.expected_output,
      position: tc.position,
    }));
  }
}

export const submissionsRepository = new SubmissionsRepository();
