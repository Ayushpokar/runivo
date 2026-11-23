import { Prisma } from '../../generated/prisma/client.js';
import {
  SubmissionsRepository,
  submissionsRepository,
  type SubmissionDetail,
  type SubmissionItem,
} from './submissions.repository.js';
import type {
  CreateSubmissionInput,
  ListSubmissionsQuery,
  UpdateSubmissionResultInput,
} from './submissions.schemas.js';

export class SubmissionError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'SubmissionError';
    this.statusCode = statusCode;
  }
}

export interface PaginatedSubmissionsResult {
  items: SubmissionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class SubmissionsService {
  private readonly repository: SubmissionsRepository;

  constructor(repository: SubmissionsRepository = submissionsRepository) {
    this.repository = repository;
  }

  async createSubmission(
    data: CreateSubmissionInput
  ): Promise<SubmissionDetail> {
    try {
      return await this.repository.create(data);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new SubmissionError(404, 'User or problem not found');
      }
      throw error;
    }
  }

  async getSubmissionById(id: bigint): Promise<SubmissionDetail> {
    const submission = await this.repository.findById(id);
    if (!submission) {
      throw new SubmissionError(
        404,
        `Submission with ID ${id.toString()} not found`
      );
    }
    return submission;
  }

  async listSubmissions(
    query: ListSubmissionsQuery
  ): Promise<PaginatedSubmissionsResult> {
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

  async getUserSubmissions(userId: bigint): Promise<SubmissionItem[]> {
    return this.repository.findByUserId(userId);
  }

  async updateSubmissionResult(
    id: bigint,
    data: UpdateSubmissionResultInput
  ): Promise<SubmissionDetail> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new SubmissionError(
        404,
        `Submission with ID ${id.toString()} not found`
      );
    }

    return this.repository.updateResult(id, data);
  }
}

export const submissionsService = new SubmissionsService();
