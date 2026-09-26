import { registerDecorator, type ValidationOptions } from 'class-validator';

// Shared by every DTO that accepts a photo URL from a client (reviews,
// gallery) - restricts it to this deployment's own storage host so a
// caller can't plant an arbitrary external link that loads in staff/admin
// browsers, gets treated as this platform's own content, or gets swapped
// out later behind the same URL (see security review).
export function IsOwnStoragePhotoUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOwnStoragePhotoUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const allowedBase = process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
          try {
            return new URL(value).host === new URL(allowedBase).host;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'photoUrls must point to this platform\'s own storage';
        },
      },
    });
  };
}
