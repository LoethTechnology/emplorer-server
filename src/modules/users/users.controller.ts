import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type {
  AuthenticatedRequest,
  UserResponse,
  UsersMessageResponse,
} from './users.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User account created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User account already exists' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(createUserDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user account' })
  @ApiResponse({ status: 200, description: 'Return the current user account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  findMe(@Req() req: AuthenticatedRequest): Promise<UserResponse> {
    return this.usersService.findMe(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.updateMe(req.user.sub, updateUserDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password change request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UsersMessageResponse> {
    return this.usersService.updatePassword(
      req.user.sub,
      updateUserPasswordDto,
    );
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  @ApiResponse({ status: 409, description: 'User account deletion is blocked' })
  removeMe(@Req() req: AuthenticatedRequest): Promise<UsersMessageResponse> {
    return this.usersService.removeMe(req.user.sub);
  }
}
