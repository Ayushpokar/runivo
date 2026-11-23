import { Router } from 'express';
import { bookmarksController } from './bookmarks.controller.js';

const bookmarksRouter = Router();

bookmarksRouter.get('/user/:user_id', bookmarksController.getUserBookmarks);
bookmarksRouter.post('/', bookmarksController.addBookmark);
bookmarksRouter.delete('/:user_id/:problem_id', bookmarksController.removeBookmark);

export default bookmarksRouter;
