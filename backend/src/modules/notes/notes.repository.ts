import prisma from '../../db/prisma.js';

export interface NoteItem {
  id: number;
  user_id: number;
  problem_id: number;
  notes_description: string;
  updated_at: Date;
  problem?: {
    id: number;
    title: string;
    difficulty: string;
  };
}

export class NotesRepository {
  async findNote(userId: bigint, problemId: bigint): Promise<NoteItem | null> {
    const note = await prisma.notes.findUnique({
      where: {
        user_id_problem_id: { user_id: userId, problem_id: problemId },
      },
    });

    return note
      ? {
          id: Number(note.id),
          user_id: Number(note.user_id),
          problem_id: Number(note.problem_id),
          notes_description: note.notes_description,
          updated_at: note.updated_at,
        }
      : null;
  }

  async findByUserId(userId: bigint): Promise<NoteItem[]> {
    const notes = await prisma.notes.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
      include: {
        problems: {
          select: { id: true, title: true, difficulty: true },
        },
      },
    });

    return notes.map((n) => ({
      id: Number(n.id),
      user_id: Number(n.user_id),
      problem_id: Number(n.problem_id),
      notes_description: n.notes_description,
      updated_at: n.updated_at,
      problem: {
        id: Number(n.problems.id),
        title: n.problems.title,
        difficulty: n.problems.difficulty,
      },
    }));
  }

  async upsertNote(
    userId: bigint,
    problemId: bigint,
    notesDescription: string
  ): Promise<NoteItem> {
    const note = await prisma.notes.upsert({
      where: {
        user_id_problem_id: { user_id: userId, problem_id: problemId },
      },
      update: {
        notes_description: notesDescription,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        problem_id: problemId,
        notes_description: notesDescription,
      },
    });

    return {
      id: Number(note.id),
      user_id: Number(note.user_id),
      problem_id: Number(note.problem_id),
      notes_description: note.notes_description,
      updated_at: note.updated_at,
    };
  }

  async deleteNote(userId: bigint, problemId: bigint): Promise<void> {
    await prisma.notes.delete({
      where: {
        user_id_problem_id: { user_id: userId, problem_id: problemId },
      },
    });
  }
}

export const notesRepository = new NotesRepository();
