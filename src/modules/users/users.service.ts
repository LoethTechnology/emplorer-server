import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import { CrudEnums, DbModels } from '../../shared/types/model.types';
import { CrudResponse } from '../../shared/utils/response/response.utils';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type {
  PublicUser,
  UserResponse,
  UserWithPassword,
  UsersMessageResponse,
} from './users.types';
import {
  isForeignKeyConstraintError,
  USERS_RESPONSE_MESSAGES,
} from './utils/users.utils';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.findUserWithPasswordByEmail(
      createUserDto.email,
    );
    const userData = {
      email: createUserDto.email,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      password: await argon2.hash(createUserDto.password),
      avatar_url: createUserDto.avatar_url ?? null,
      linkedin_profile_url: createUserDto.linkedin_profile_url ?? null,
    };

    if (existingUser?.deleted_at) {
      throw new ConflictException(USERS_RESPONSE_MESSAGES.emailAlreadyInUse);
    }

    if (existingUser?.password) {
      throw new ConflictException(USERS_RESPONSE_MESSAGES.localAccountExists);
    }

    if (existingUser) {
      const updatedUser = await this.prismaService.user.update({
        where: { id: existingUser.id },
        data: userData,
      });

      return CrudResponse(DbModels.USER, CrudEnums.CREATE, updatedUser);
    }

    const createdUser = await this.prismaService.user.create({
      data: userData,
    });

    return CrudResponse(DbModels.USER, CrudEnums.CREATE, createdUser);
  }

  async findMe(userId: string): Promise<UserResponse> {
    const dbUser = await this.findActiveUserById(userId);

    return CrudResponse(DbModels.USER, CrudEnums.READ, dbUser);
  }

  async updateMe(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    await this.findActiveUserById(userId);
    const data = { ...updateUserDto };

    if (data.email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(USERS_RESPONSE_MESSAGES.emailAlreadyInUse);
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data,
    });

    return CrudResponse(DbModels.USER, CrudEnums.UPDATE, updatedUser);
  }

  async updatePassword(
    userId: string,
    updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UsersMessageResponse> {
    const dbUser = await this.findUserWithPasswordById(userId);

    if (dbUser.deleted_at) {
      throw new NotFoundException(USERS_RESPONSE_MESSAGES.userNotFound);
    }

    if (!dbUser.email || !dbUser.password) {
      throw new BadRequestException(
        USERS_RESPONSE_MESSAGES.localPasswordRequired,
      );
    }

    const currentPasswordMatches = await argon2.verify(
      dbUser.password,
      updateUserPasswordDto.oldPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException(USERS_RESPONSE_MESSAGES.invalidPassword);
    }

    const nextPasswordHash = await argon2.hash(
      updateUserPasswordDto.newPassword,
    );

    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: nextPasswordHash },
    });

    return CrudResponse(
      DbModels.USER,
      CrudEnums.UPDATE,
      USERS_RESPONSE_MESSAGES.passwordUpdated,
    );
  }

  async removeMe(userId: string): Promise<UsersMessageResponse> {
    await this.findActiveUserById(userId);

    try {
      await this.prismaService.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          USERS_RESPONSE_MESSAGES.accountDeleteBlocked,
        );
      }

      throw error;
    }

    return CrudResponse(
      DbModels.USER,
      CrudEnums.DELETE,
      USERS_RESPONSE_MESSAGES.accountDeleted,
    );
  }

  private async findActiveUserById(userId: string): Promise<PublicUser> {
    const dbUser = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser || dbUser.deleted_at) {
      throw new NotFoundException(USERS_RESPONSE_MESSAGES.userNotFound);
    }

    return dbUser;
  }

  private async findUserWithPasswordById(
    userId: string,
  ): Promise<UserWithPassword> {
    const dbUser = (await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        deleted_at: true,
      },
    })) as UserWithPassword | null;

    if (!dbUser) {
      throw new NotFoundException(USERS_RESPONSE_MESSAGES.userNotFound);
    }

    return dbUser;
  }

  private async findUserWithPasswordByEmail(
    email: string,
  ): Promise<UserWithPassword | null> {
    return (await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        deleted_at: true,
      },
    })) as UserWithPassword | null;
  }
}
