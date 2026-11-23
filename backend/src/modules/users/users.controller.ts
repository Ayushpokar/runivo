import type { Request, Response } from "express";
import { createUserSchema, userIdParamSchema, updateUserSchema } from "./users.schemas.js";
import { ZodError } from "zod";
import { UserError, usersService, UsersService } from "./users.service.js";


export function handleControllerError(res: Response, error: unknown): void{
    if (error instanceof ZodError){
        res.status(400).json({
            status: "error",
            message: "Validation failed",
            errors: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
            })),
        });
        return;
    }

    if (error instanceof UserError) {
        res.status(error.statusCode).json({
            status: "error",
            message: error.message,
        });
        return;
    }

    console.error("Unexpected error", error);
    res.status(500).json({
        status: "error",
        message: "Internal server error"
    })
}


export class UsersController {
    private readonly service: UsersService;

    constructor(service: UsersService = usersService){
        this.service = service;
    }

    createUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const data = createUserSchema.parse(req.body);
            const user = await this.service.createUser(data);
            res.status(201).json({ status: "success", data: user });
        } catch (error: unknown) {
            handleControllerError(res, error)
        }
    };

    getUserById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = userIdParamSchema.parse(req.params);
            const user = await this.service.getUserById(BigInt(id));
            res.status(200).json({ status: "success", data: user });
        } catch (error: unknown) {
            handleControllerError(res, error)
        }
    }

    updateUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = userIdParamSchema.parse(req.params)
            const data = updateUserSchema.parse(req.body);
            const updateuser = await this.service.updateUser(BigInt(id), data);
            res.status(200).json({ status: "success", data: updateuser });
        } catch (error) {
            handleControllerError(res, error)
        }
    }    

    deleteUser = async (req: Request, res: Response): Promise<void> =>{
        try {
            const { id } = userIdParamSchema.parse(req.params)
            await this.service.deleteUser(BigInt(id));
            res.status(200).json({
                status: "success",
                message: "User deleted successfully",
            });
        } catch (error) {
            handleControllerError(res, error)
        }
    }
 }



export const usersController = new UsersController();