import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createSubmissionSchema,
  listSubmissionsQuerySchema,
  submissionIdParamSchema,
  updateSubmissionResultSchema,
  userSubmissionsParamSchema,
} from './submissions.schemas.js';
import {
  SubmissionError,
  SubmissionsService,
  submissionsService,
} from './submissions.service.js';

function handleControllerError(
  res: Response,
  error: unknown,
  context: string
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof SubmissionError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error(`Error in ${context}:`, error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}

export class SubmissionsController {
  private readonly service: SubmissionsService;

  constructor(service: SubmissionsService = submissionsService) {
    this.service = service;
  }

  createSubmission = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = createSubmissionSchema.parse(req.body);
      const submission = await this.service.createSubmission(data);

      res.status(201).json({
        status: 'success',
        data: submission,
      });
    } catch (error: unknown) {
      handleControllerError(
        res,
        error,
        'SubmissionsController.createSubmission'
      );
    }
  };

  getSubmissionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = submissionIdParamSchema.parse(req.params);
      const submission = await this.service.getSubmissionById(BigInt(id));

      res.status(200).json({
        status: 'success',
        data: submission,
      });
    } catch (error: unknown) {
      handleControllerError(
        res,
        error,
        'SubmissionsController.getSubmissionById'
      );
    }
  };

  listSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = listSubmissionsQuerySchema.parse(req.query);
      const result = await this.service.listSubmissions(query);

      res.status(200).json({
        status: 'success',
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      handleControllerError(
        res,
        error,
        'SubmissionsController.listSubmissions'
      );
    }
  };

  getUserSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = userSubmissionsParamSchema.parse(req.params);
      const submissions = await this.service.getUserSubmissions(
        BigInt(user_id)
      );

      res.status(200).json({
        status: 'success',
        data: submissions,
      });
    } catch (error: unknown) {
      handleControllerError(
        res,
        error,
        'SubmissionsController.getUserSubmissions'
      );
    }
  };

  updateSubmissionResult = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = submissionIdParamSchema.parse(req.params);
      const data = updateSubmissionResultSchema.parse(req.body);
      const submission = await this.service.updateSubmissionResult(
        BigInt(id),
        data
      );

      res.status(200).json({
        status: 'success',
        data: submission,
      });
    } catch (error: unknown) {
      handleControllerError(
        res,
        error,
        'SubmissionsController.updateSubmissionResult'
      );
    }
  };
}

export const submissionsController = new SubmissionsController();
