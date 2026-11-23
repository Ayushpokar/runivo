import {
  UsersRepository,
  usersRepository,
  type PublicUser,
} from '../users/users.repository.js';
import { signJwt, verifyPassword } from '../../utils/crypto.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

export class AuthError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export class AuthService {
  private readonly repository: UsersRepository;

  constructor(repository: UsersRepository = usersRepository) {
    this.repository = repository;
  }

  async register(data: RegisterInput): Promise<AuthResponse> {
    const existingByEmail = await this.repository.findByEmail(data.email);
    if (existingByEmail) {
      throw new AuthError(409, 'Email already in use');
    }

    const existingByUsername = await this.repository.findByUsername(
      data.username
    );
    if (existingByUsername) {
      throw new AuthError(409, 'Username already in use');
    }

    const user = await this.repository.createUser(data);
    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return { user, token };
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    const userWithHash = await this.repository.findByEmailWithPassword(
      data.email
    );
    if (!userWithHash) {
      throw new AuthError(401, 'Invalid email or password');
    }

    const isValid = await verifyPassword(
      data.password,
      userWithHash.password_hash
    );
    if (!isValid) {
      throw new AuthError(401, 'Invalid email or password');
    }

    const user: PublicUser = {
      id: userWithHash.id,
      username: userWithHash.username,
      name: userWithHash.name,
      email: userWithHash.email,
      created_at: userWithHash.created_at,
    };

    const token = signJwt({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return { user, token };
  }

  async getCurrentUser(userId: bigint): Promise<PublicUser> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AuthError(404, 'User not found');
    }
    return user;
  }
}

export const authService = new AuthService();
