import { Prisma } from '../../generated/prisma/client.js';
import env from '../../config/env.js';
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
    let submission: SubmissionDetail;
    try {
      submission = await this.repository.create(data);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new SubmissionError(404, 'User or problem not found');
      }
      throw error;
    }

    // Asynchronously dispatch submission + problem test cases to FastAPI Judge Service
    void this.dispatchToJudgeService(submission);

    return submission;
  }

  private async dispatchToJudgeService(
    submission: SubmissionDetail
  ): Promise<void> {
    try {
      const testCases = await this.repository.findTestCasesByProblemId(
        BigInt(submission.problem_id)
      );

      const response = await fetch(
        `${env.JUDGE_SERVICE_URL}/api/v1/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: submission.id,
            problem_id: submission.problem_id,
            language: submission.language,
            source_code: submission.source_code,
            test_cases: testCases,
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          `Judge service returned HTTP ${response.status} for submission ${submission.id}`
        );
      }
    } catch (error: unknown) {
      console.warn(
        `Could not reach judge-service at ${env.JUDGE_SERVICE_URL} for submission ${submission.id}:`,
        error instanceof Error ? error.message : error
      );
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
