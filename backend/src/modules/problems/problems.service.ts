import { Prisma } from '../../generated/prisma/client.js';
import {
  ProblemsRepository,
  problemsRepository,
  type ProblemDetail,
  type ProblemListItem,
} from './problems.repository.js';
import type {
  CreateProblemInput,
  ListProblemsQuery,
  UpdateProblemInput,
} from './problems.schemas.js';

export class ProblemError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ProblemError';
    this.statusCode = statusCode;
  }
}

export interface PaginatedProblemsResult {
  items: ProblemListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProblemsService {
  private readonly repository: ProblemsRepository;

  constructor(repository: ProblemsRepository = problemsRepository) {
    this.repository = repository;
  }

  async listProblems(query: ListProblemsQuery): Promise<PaginatedProblemsResult> {
    const { items, total } = await this.repository.findMany(query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getProblemById(id: bigint): Promise<ProblemDetail> {
    const problem = await this.repository.findById(id, {
      onlySampleTestCases: true,
    });

    if (!problem) {
      throw new ProblemError(404, `Problem with ID ${id.toString()} not found`);
    }

    return problem;
  }

  async createProblem(data: CreateProblemInput): Promise<ProblemDetail> {
    const existing = await this.repository.findByTitle(data.title);
    if (existing) {
      throw new ProblemError(
        409,
        `A problem with title "${data.title}" already exists`
      );
    }

    try {
      return await this.repository.create(data, { onlySampleTestCases: false });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ProblemError(
          409,
          `A problem with title "${data.title}" already exists`
        );
      }
      throw error;
    }
  }

  async updateProblem(
    id: bigint,
    data: UpdateProblemInput
  ): Promise<ProblemDetail> {
    const exists = await this.repository.existsById(id);
    if (!exists) {
      throw new ProblemError(404, `Problem with ID ${id.toString()} not found`);
    }

    if (data.title !== undefined) {
      const existingByTitle = await this.repository.findByTitle(data.title);
      if (existingByTitle && existingByTitle.id !== id) {
        throw new ProblemError(
          409,
          `A problem with title "${data.title}" already exists`
        );
      }
    }

    try {
      return await this.repository.update(id, data, {
        onlySampleTestCases: false,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ProblemError(
          409,
          `A problem with title "${data.title ?? ''}" already exists`
        );
      }
      throw error;
    }
  }

  async deleteProblem(id: bigint): Promise<void> {
    const exists = await this.repository.existsById(id);
    if (!exists) {
      throw new ProblemError(404, `Problem with ID ${id.toString()} not found`);
    }

    try {
      await this.repository.deleteById(id);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ProblemError(
          409,
          'Cannot delete problem because it has existing submissions'
        );
      }
      throw error;
    }
  }
}

export const problemsService = new ProblemsService();

