import { Router } from 'express';
import { problemsController } from './problems.controller.js';

const problemsRouter = Router();

problemsRouter.get('/', problemsController.listProblems);
problemsRouter.get('/:id', problemsController.getProblemById);
problemsRouter.post('/', problemsController.createProblem);
problemsRouter.patch('/:id', problemsController.updateProblem);
problemsRouter.delete('/:id', problemsController.deleteProblem);

export default problemsRouter;

