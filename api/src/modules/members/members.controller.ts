import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { TripInviteItem, TripMemberItem } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MembersService } from './members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { RespondInviteDto } from './dto/respond-invite.dto';

@Controller()
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get('me/trip-invites')
  myInvites(@CurrentUser() userId: string): Promise<TripInviteItem[]> {
    return this.members.myInvites(userId);
  }

  @Get('trips/:id/members')
  list(@CurrentUser() viewerId: string, @Param('id') id: string): Promise<TripMemberItem[]> {
    return this.members.list(viewerId, id);
  }

  @Post('trips/:id/members')
  invite(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ): Promise<TripMemberItem> {
    return this.members.invite(userId, id, dto.user_id);
  }

  @Post('trips/:id/members/respond')
  respond(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: RespondInviteDto,
  ): Promise<TripMemberItem> {
    return this.members.respond(userId, id, dto.status);
  }

  @Delete('trips/:id/members/:userId')
  @HttpCode(204)
  remove(
    @CurrentUser() actorId: string,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    return this.members.remove(actorId, id, targetUserId);
  }
}
