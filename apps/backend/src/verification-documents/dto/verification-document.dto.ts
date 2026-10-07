import { MaxLength } from 'class-validator';
import { IsOwnStoragePhotoUrl } from '../../common/ownStoragePhotoUrl';

export class CreateVerificationDocumentDto {
  @IsOwnStoragePhotoUrl()
  @MaxLength(2000)
  url: string;
}
