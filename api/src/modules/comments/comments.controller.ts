import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { CommentItem } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @PublicRead()
  @Get('stops/:id/comments')
  list(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<CommentItem[]> {
    return this.comments.list(userId ?? null, id);
  }

  @Post('stops/:id/comments')
  create(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentItem> {
    return this.comments.create(userId, id, dto.content);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.comments.remove(userId, id);
  }
}
