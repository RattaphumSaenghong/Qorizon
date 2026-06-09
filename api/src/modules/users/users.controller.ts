import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { FollowStateResponse, PublicUser } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Specific routes before the ':id' param route so they aren't shadowed.
  @PublicRead()
  @Get('by-username/:username')
  getByUsername(
    @CurrentUser() viewerId: string | undefined,
    @Param('username') username: string,
  ): Promise<PublicUser> {
    return this.users.getByUsername(viewerId ?? null, username);
  }

  // People `id` follows (trip-invite picker).
  @Get(':id/following')
  getFollowing(@Param('id') id: string): Promise<PublicUser[]> {
    return this.users.getFollowing(id);
  }

  @Get(':id/is-following')
  async isFollowing(
    @CurrentUser() currentUserId: string,
    @Param('id') id: string,
  ): Promise<FollowStateResponse> {
    return { is_following: await this.users.isFollowing(currentUserId, id) };
  }

  @Post(':id/follow')
  @HttpCode(204)
  follow(@CurrentUser() currentUserId: string, @Param('id') id: string): Promise<void> {
    return this.users.follow(currentUserId, id);
  }

  @Delete(':id/follow')
  @HttpCode(204)
  unfollow(@CurrentUser() currentUserId: string, @Param('id') id: string): Promise<void> {
    return this.users.unfollow(currentUserId, id);
  }

  @Patch(':id')
  updateProfile(
    @CurrentUser() currentUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    if (id !== currentUserId) throw new ForbiddenException('cannot edit another user');
    return this.users.updateProfile(currentUserId, dto);
  }

  @PublicRead()
  @Get(':id')
  getById(
    @CurrentUser() viewerId: string | undefined,
    @Param('id') id: string,
  ): Promise<PublicUser> {
    return this.users.getById(viewerId ?? null, id);
  }
}
