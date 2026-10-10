import { IsString, Length } from 'class-validator';

export class ConfirmRegisterDto {
  @IsString()
  pendingToken: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
