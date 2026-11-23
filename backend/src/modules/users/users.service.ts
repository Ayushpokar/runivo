import { UsersRepository } from "./users.repository.js";
import type { CreateUserInput, UpdateUserInput } from "./users.schemas.js";
import type { PublicUser } from "./users.repository.js";

export class UserError extends Error {
    public readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "UserError";
        this.statusCode = statusCode;
    }
}

export class UsersService {
    private readonly repository: UsersRepository;

    constructor(repository: UsersRepository = new UsersRepository()) {
        this.repository = repository;
    }

    async createUser(data: CreateUserInput): Promise<PublicUser> {
        const existingUserByEmail = await this.repository.findByEmail(data.email);
        if (existingUserByEmail) {
            throw new UserError(409, "Email already in use");
        }

        const existingUserByUsername = await this.repository.findByUsername(data.username);
        if (existingUserByUsername) {
            throw new UserError(409, "Username already in use");
        }

        const newUser = await this.repository.createUser(data);
        return newUser;
    }

    async getUserById(id: bigint): Promise<PublicUser> {
        const user = await this.repository.findById(id);
        if (!user) {
            throw new UserError(404, "User not found");
        }
        return user;
    }

    async updateUser(id: bigint, data: UpdateUserInput): Promise<PublicUser | null> {
        const existingUser = await this.repository.findById(id);
        if (!existingUser) {
            throw new UserError(404, "User not found");
        }   

        if (data.email && data.email !== existingUser.email) {
            const existingUserByEmail = await this.repository.findByEmail(data.email);
            if (existingUserByEmail) {
                throw new UserError(409, "Email already in use");
            }
        }   

        if (data.username && data.username !== existingUser.username) {
            const existingUserByUsername = await this.repository.findByUsername(data.username);
            if (existingUserByUsername) {
                throw new UserError(409, "Username already in use");
            }
        }

        const updatedUser = await this.repository.updateUser(id, data);
        return updatedUser;
    }

    //Delete user by id
    async deleteUser(id: bigint): Promise<void> {
        const existingUser = await this.repository.findById(id);
        if (!existingUser) {
            throw new UserError(404, "User not found");
        }

        await this.repository.deleteUser(id);
    }
}


export const usersService = new UsersService();