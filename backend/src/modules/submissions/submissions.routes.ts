import { Router } from 'express';
import { submissionsController } from './submissions.controller.js';

const submissionsRouter = Router();

submissionsRouter.get('/', submissionsController.listSubmissions);
submissionsRouter.get('/user/:user_id', submissionsController.getUserSubmissions);
submissionsRouter.get('/:id', submissionsController.getSubmissionById);
submissionsRouter.post('/', submissionsController.createSubmission);
submissionsRouter.patch('/:id/result', submissionsController.updateSubmissionResult);

export default submissionsRouter;
