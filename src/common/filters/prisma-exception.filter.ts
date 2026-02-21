import { ArgumentsHost, Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2002':
        // Unique constraint failed.
        throw new ConflictException(
          `Unique constraint failed on: ${exception.meta?.target}`,
        );

      case 'P2003':
        // Foreign key constraint failed on delete/update.
        throw new ConflictException(
          'Cannot delete or update: this record is still referenced by other data.',
        );

      case 'P2025':
        // Record not found during an update or delete operation.
        throw new NotFoundException('Record not found.');

      default:
        // Unhandled Prisma errors bubble up as 500s via the base filter.
        super.catch(exception, host);
    }
  }
}