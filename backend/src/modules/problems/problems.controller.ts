import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createProblemSchema,
  listProblemsQuerySchema,
  problemIdParamSchema,
  updateProblemSchema,
} from './problems.schemas.js';
import {
  ProblemError,
  ProblemsService,
  problemsService,
} from './problems.service.js';

function handleControllerError(res: Response, error: unknown, context: string): void {
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

  if (error instanceof ProblemError) {
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

export class ProblemsController {
  private readonly service: ProblemsService;

  constructor(service: ProblemsService = problemsService) {
    this.service = service;
  }

  listProblems = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = listProblemsQuerySchema.parse(req.query);
      const result = await this.service.listProblems(query);

      res.status(200).json({
        status: 'success',
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: unknown) {  
      handleControllerError(res, error, 'ProblemsController.listProblems');
    }
  };

  getProblemById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = problemIdParamSchema.parse(req.params);
      const problem = await this.service.getProblemById(id);

      res.status(200).json({
        status: 'success',
        data: problem,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'ProblemsController.getProblemById');
    }
  };

  createProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = createProblemSchema.parse(req.body);
      const problem = await this.service.createProblem(payload);

      res.status(201).json({
        status: 'success',
        data: problem,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'ProblemsController.createProblem');
    }
  };

  updateProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = problemIdParamSchema.parse(req.params);
      const payload = updateProblemSchema.parse(req.body);
      const problem = await this.service.updateProblem(id, payload);

      res.status(200).json({
        status: 'success',
        data: problem,
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'ProblemsController.updateProblem');
    }
  };

  deleteProblem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = problemIdParamSchema.parse(req.params);
      await this.service.deleteProblem(id);

      res.status(200).json({
        status: 'success',
        message: 'Problem deleted successfully',
      });
    } catch (error: unknown) {
      handleControllerError(res, error, 'ProblemsController.deleteProblem');
    }
  };
}

export const problemsController = new ProblemsController();

