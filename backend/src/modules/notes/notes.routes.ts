import { Router } from 'express';
import { notesController } from './notes.controller.js';

const notesRouter = Router();

notesRouter.get('/user/:user_id', notesController.getUserNotes);
notesRouter.get('/:user_id/:problem_id', notesController.getNote);
notesRouter.put('/', notesController.upsertNote);
notesRouter.delete('/:user_id/:problem_id', notesController.deleteNote);

export default notesRouter;
