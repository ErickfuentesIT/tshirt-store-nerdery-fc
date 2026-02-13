import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HealthResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from GraphQL!';
  }
}
