//this is place we talk with database
import prisma from "../../db/prisma.js";

export interface BookmarkItem{
    user_id: number;
    problem_id: number;
    created_at: Date;
    problem?: {
        id: number,
        title: string,
        difficulty: string;
    }
}

export class BookmarksRepository{
    async findBookmark(userId: bigint, problemId: bigint): Promise<BookmarkItem | null>{
        const bookmark = await prisma.bookmarks.findUnique({
            where: {
                user_id_problem_id: { user_id: userId, problem_id: problemId }
            },
        });
        return bookmark
        ? {
            user_id: Number(bookmark.user_id),
            problem_id: Number(bookmark.problem_id),
            created_at: bookmark.created_at,
        }
        : null;
    }

    async findByUserId(userId: bigint): Promise<BookmarkItem[]>{
        const bookmarks = await prisma.bookmarks.findMany({
            where:{
                user_id: userId
            },
            orderBy: { created_at: 'desc'},
            include: { 
                problems: {
                    select: { id: true, title: true, difficulty: true }
                }
            }
        });
        return bookmarks.map((b)=>({
            user_id: Number(b.user_id),
            problem_id: Number(b.problem_id),
            created_at: b.created_at,
            problem: {
                id: Number(b.problems.id),
                title: b.problems.title,
                difficulty: b.problems.difficulty
            },
        }))
    }

    async createBookmark(userId: bigint, problemId: bigint): Promise<BookmarkItem>{
        const created = await prisma.bookmarks.create({
            data: {
                user_id: userId,
                problem_id: problemId
            },
        });
        return {
            user_id: Number(created.user_id),
            problem_id: Number(created.problem_id),
            created_at: created.created_at,
        };
    }

    async deleteBookmark(userId: bigint, problemId: bigint): Promise<void>{
        await prisma.bookmarks.delete({
            where: {
                user_id_problem_id: { user_id: userId, problem_id: problemId},
            },
        });
    }   
}

export const bookmarkRepository = new BookmarksRepository();