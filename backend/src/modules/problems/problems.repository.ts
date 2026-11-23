import prisma from '../../db/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateProblemInput,
  ListProblemsQuery,
  UpdateProblemInput,
} from './problems.schemas.js';

export interface ProblemListItem {
  id: number;
  title: string;
  difficulty: string;
  created_at: Date;
  tags: Array<{
    id: number;
    name: string;
  }>;
}

export interface ProblemDetail extends ProblemListItem {
  description: string;
  input_format: string | null;
  output_format: string | null;
  constraints: Array<{
    id: number;
    constraint_text: string;
  }>;
  examples: Array<{
    id: number;
    example_input: string;
    example_output: string;
    explanation: string | null;
    position: number;
  }>;
  hints: Array<{
    id: number;
    hint_description: string;
    hint_level: number;
  }>;
  test_cases: Array<{
    id: number;
    input_data: string;
    expected_output: string;
    is_sample: boolean;
    position: number;
  }>;
}

const problemDetailInclude = (onlySampleTestCases: boolean) =>
  ({
    problem_constraints: {
      orderBy: { id: 'asc' as const },
    },
    examples: {
      orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    },
    hints: {
      orderBy: [{ hint_level: 'asc' as const }, { id: 'asc' as const }],
    },
    problem_tags: {
      include: {
        tags: true,
      },
      orderBy: {
        tag_id: 'asc' as const,
      },
    },
    test_cases: {
      ...(onlySampleTestCases ? { where: { is_sample: true } } : {}),
      orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    },
  }) satisfies Prisma.problemsInclude;

type ProblemWithDetails = Prisma.problemsGetPayload<{
  include: ReturnType<typeof problemDetailInclude>;
}>;

function mapProblemDetail(record: ProblemWithDetails): ProblemDetail {
  return {
    id: Number(record.id),
    title: record.title,
    difficulty: record.difficulty,
    description: record.description,
    input_format: record.input_format,
    output_format: record.output_format,
    created_at: record.created_at,
    constraints: record.problem_constraints.map((c) => ({
      id: Number(c.id),
      constraint_text: c.constraint_text,
    })),
    examples: record.examples.map((e) => ({
      id: Number(e.id),
      example_input: e.example_input,
      example_output: e.example_output,
      explanation: e.explanation,
      position: e.position,
    })),
    hints: record.hints.map((h) => ({
      id: Number(h.id),
      hint_description: h.hint_description,
      hint_level: h.hint_level,
    })),
    tags: record.problem_tags.map((pt) => ({
      id: Number(pt.tags.id),
      name: pt.tags.name,
    })),
    test_cases: record.test_cases.map((tc) => ({
      id: Number(tc.id),
      input_data: tc.input_data,
      expected_output: tc.expected_output,
      is_sample: tc.is_sample,
      position: tc.position,
    })),
  };
}

export class ProblemsRepository {
  async findMany(
    query: ListProblemsQuery
  ): Promise<{ items: ProblemListItem[]; total: number }> {
    const { page, limit, difficulty, tag, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.problemsWhereInput = {
      ...(difficulty !== undefined ? { difficulty } : {}),
      ...(search !== undefined
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
      ...(tag !== undefined
        ? {
            problem_tags: {
              some: {
                tags: {
                  name: { equals: tag.toLowerCase(), mode: 'insensitive' },
                },
              },
            },
          }
        : {}),
    };

    const [records, total] = await prisma.$transaction([
      prisma.problems.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          title: true,
          difficulty: true,
          created_at: true,
          problem_tags: {
            include: {
              tags: true,
            },
            orderBy: {
              tag_id: 'asc',
            },
          },
        },
      }),
      prisma.problems.count({ where }),
    ]);

    const items: ProblemListItem[] = records.map((record) => ({
      id: Number(record.id),
      title: record.title,
      difficulty: record.difficulty,
      created_at: record.created_at,
      tags: record.problem_tags.map((pt) => ({
        id: Number(pt.tags.id),
        name: pt.tags.name,
      })),
    }));

    return { items, total };
  }

  async findById(
    id: bigint,
    options: { onlySampleTestCases?: boolean } = {}
  ): Promise<ProblemDetail | null> {
    const onlySampleTestCases = options.onlySampleTestCases ?? true;

    const record = await prisma.problems.findUnique({
      where: { id },
      include: problemDetailInclude(onlySampleTestCases),
    });

    if (!record) {
      return null;
    }

    return mapProblemDetail(record);
  }

  async existsById(id: bigint): Promise<boolean> {
    const record = await prisma.problems.findUnique({
      where: { id },
      select: { id: true },
    });
    return record !== null;
  }

  async findByTitle(title: string): Promise<{ id: bigint; title: string } | null> {
    return prisma.problems.findUnique({
      where: { title },
      select: { id: true, title: true },
    });
  }

  async create(
    data: CreateProblemInput,
    options: { onlySampleTestCases?: boolean } = {}
  ): Promise<ProblemDetail> {
    const onlySampleTestCases = options.onlySampleTestCases ?? true;
    const uniqueTags = data.tags ? Array.from(new Set(data.tags)) : undefined;

    const created = await prisma.problems.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        description: data.description,
        input_format: data.input_format ?? null,
        output_format: data.output_format ?? null,
        ...(data.constraints && data.constraints.length > 0
          ? {
              problem_constraints: {
                create: data.constraints.map((c) => ({
                  constraint_text: c.constraint_text,
                })),
              },
            }
          : {}),
        ...(data.examples && data.examples.length > 0
          ? {
              examples: {
                create: data.examples.map((ex, idx) => ({
                  example_input: ex.example_input,
                  example_output: ex.example_output,
                  explanation: ex.explanation ?? null,
                  position: ex.position ?? idx + 1,
                })),
              },
            }
          : {}),
        ...(data.hints && data.hints.length > 0
          ? {
              hints: {
                create: data.hints.map((hint, idx) => ({
                  hint_description: hint.hint_description,
                  hint_level: hint.hint_level ?? idx + 1,
                })),
              },
            }
          : {}),
        ...(data.test_cases && data.test_cases.length > 0
          ? {
              test_cases: {
                create: data.test_cases.map((tc, idx) => ({
                  input_data: tc.input_data,
                  expected_output: tc.expected_output,
                  is_sample: tc.is_sample,
                  position: tc.position ?? idx + 1,
                })),
              },
            }
          : {}),
        ...(uniqueTags && uniqueTags.length > 0
          ? {
              problem_tags: {
                create: uniqueTags.map((tagName) => ({
                  tags: {
                    connectOrCreate: {
                      where: { name: tagName },
                      create: { name: tagName },
                    },
                  },
                })),
              },
            }
          : {}),
      },
      include: problemDetailInclude(onlySampleTestCases),
    });

    return mapProblemDetail(created);
  }

  async update(
    id: bigint,
    data: UpdateProblemInput,
    options: { onlySampleTestCases?: boolean } = {}
  ): Promise<ProblemDetail> {
    const onlySampleTestCases = options.onlySampleTestCases ?? true;
    const uniqueTags =
      data.tags !== undefined ? Array.from(new Set(data.tags)) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (data.constraints !== undefined) {
        await tx.problem_constraints.deleteMany({ where: { problem_id: id } });
      }
      if (data.examples !== undefined) {
        await tx.examples.deleteMany({ where: { problem_id: id } });
      }
      if (data.hints !== undefined) {
        await tx.hints.deleteMany({ where: { problem_id: id } });
      }
      if (data.test_cases !== undefined) {
        await tx.test_cases.deleteMany({ where: { problem_id: id } });
      }
      if (uniqueTags !== undefined) {
        await tx.problem_tags.deleteMany({ where: { problem_id: id } });
      }

      return tx.problems.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.difficulty !== undefined
            ? { difficulty: data.difficulty }
            : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.input_format !== undefined
            ? { input_format: data.input_format }
            : {}),
          ...(data.output_format !== undefined
            ? { output_format: data.output_format }
            : {}),
          ...(data.constraints && data.constraints.length > 0
            ? {
                problem_constraints: {
                  create: data.constraints.map((c) => ({
                    constraint_text: c.constraint_text,
                  })),
                },
              }
            : {}),
          ...(data.examples && data.examples.length > 0
            ? {
                examples: {
                  create: data.examples.map((ex, idx) => ({
                    example_input: ex.example_input,
                    example_output: ex.example_output,
                    explanation: ex.explanation ?? null,
                    position: ex.position ?? idx + 1,
                  })),
                },
              }
            : {}),
          ...(data.hints && data.hints.length > 0
            ? {
                hints: {
                  create: data.hints.map((hint, idx) => ({
                    hint_description: hint.hint_description,
                    hint_level: hint.hint_level ?? idx + 1,
                  })),
                },
              }
            : {}),
          ...(data.test_cases && data.test_cases.length > 0
            ? {
                test_cases: {
                  create: data.test_cases.map((tc, idx) => ({
                    input_data: tc.input_data,
                    expected_output: tc.expected_output,
                    is_sample: tc.is_sample,
                    position: tc.position ?? idx + 1,
                  })),
                },
              }
            : {}),
          ...(uniqueTags && uniqueTags.length > 0
            ? {
                problem_tags: {
                  create: uniqueTags.map((tagName) => ({
                    tags: {
                      connectOrCreate: {
                        where: { name: tagName },
                        create: { name: tagName },
                      },
                    },
                  })),
                },
              }
            : {}),
        },
        include: problemDetailInclude(onlySampleTestCases),
      });
    });

    return mapProblemDetail(updated);
  }

  async deleteById(id: bigint): Promise<void> {
    await prisma.problems.delete({
      where: { id },
    });
  }
}

export const problemsRepository = new ProblemsRepository();

