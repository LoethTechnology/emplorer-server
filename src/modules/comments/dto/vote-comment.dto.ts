import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CommentVoteValue } from 'prisma/generated/prisma/enums';

export class VoteCommentDto {
  @ApiProperty({
    enum: CommentVoteValue,
    description: 'Vote value: HELPFUL or NOT_HELPFUL',
  })
  @IsEnum(CommentVoteValue)
  value!: CommentVoteValue;
}
