import prisma from '../../db/prisma.js';
import type { CreateUserInput, UpdateUserInput } from './users.schemas.js';
import { hashPassword } from '../../utils/crypto.js';

export interface PublicUser {
    id: number;
    username: string;
    name: string;
    email: string;
    created_at: Date;
}

export interface UserWithPasswordHash extends PublicUser {
    password_hash: string;
}

const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  created_at: true,
} as const;


export class UsersRepository {
    async findByEmail(email: string): Promise<PublicUser | null> {
        const user = await prisma.users.findUnique({
            where: { email },
            select: publicUserSelect
        });
        return user ? { ...user, id: Number(user.id) } : null;
    }

    async findByEmailWithPassword(email: string): Promise<UserWithPasswordHash | null> {
        const user = await prisma.users.findUnique({
            where: { email },
            select: {
                ...publicUserSelect,
                password_hash: true,
            },
        });
        return user ? { ...user, id: Number(user.id) } : null;
    }

    async findByUsername(username: string): Promise<PublicUser | null> {
        const user = await prisma.users.findUnique({
            where: { username },
            select: publicUserSelect
        });
        return user ? { ...user, id: Number(user.id) } : null;
    }

    async findById(id: bigint): Promise<PublicUser | null> {
        const user = await prisma.users.findUnique({
            where: { id },
            select: publicUserSelect
        });
        return user ? { ...user, id: Number(user.id) } : null;
    }

    async createUser(data: CreateUserInput): Promise<PublicUser> {
        const hashedPassword = await hashPassword(data.password);
        const user = await prisma.users.create({
            data: {
                username: data.username,
                name: data.name,
                email: data.email,
                password_hash: hashedPassword
            },
            select: publicUserSelect
        });
        return { ...user, id: Number(user.id) };
    }   

    async updateUser(id: bigint, data: UpdateUserInput): Promise<PublicUser | null> {
        const hashedPassword =
            data.password !== undefined
                ? await hashPassword(data.password)
                : undefined;

        const user = await prisma.users.update({
            where: { id },  
            data: {
                ...data.username !== undefined ? { username: data.username } : {},
                ...data.name !== undefined ? { name: data.name } : {},
                ...data.email !== undefined ? { email: data.email } : {},
                ...hashedPassword !== undefined ? { password_hash: hashedPassword } : {}
            },  
            select: publicUserSelect
        });
        return user ? { ...user, id: Number(user.id) } : null;
    }

    async deleteUser(id: bigint): Promise<void> {
        await prisma.users.delete({
            where: { id }
        });
    }
}

export const usersRepository = new UsersRepository();
