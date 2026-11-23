import { Router } from "express";
import { usersController } from "./users.controller.js";

const usersRouter = Router();

usersRouter.post("/", usersController.createUser);
usersRouter.get("/:id", usersController.getUserById);
usersRouter.delete("/:id", usersController.deleteUser);
usersRouter.patch("/:id", usersController.updateUser);

export default usersRouter;
