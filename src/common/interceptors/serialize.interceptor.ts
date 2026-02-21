import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { SERIALIZE_KEY } from '../decorators/serialize.decorator.js';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const dto = this.reflector.get<new (...args: any[]) => any>(
      SERIALIZE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        if (!dto) {
          return data;
        }
        return plainToInstance(dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
