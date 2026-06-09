import { IsUUID } from 'class-validator';

export class InviteMemberDto {
  @IsUUID()
  user_id!: string;
}
