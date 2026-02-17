import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Attribute } from '../models/attribute.model.js';
import { AttributesService } from '../services/attributes.service.js';
import { CreateAttributeInput } from '../dto/create-attribute.input.js';
import { UpdateAttributeInput } from '../dto/update-attribute.input.js';

@Resolver(() => Attribute)
export class AttributesResolver {
  constructor(private readonly attributesService: AttributesService) {}

  @Query(() => [Attribute], { name: 'attributes' })
  async findAll() {
    return this.attributesService.findAll();
  }

  @Query(() => Attribute, { name: 'attribute' })
  async findOne(@Args('id', { type: () => ID }) id: string) {
    return this.attributesService.findOne(id);
  }

  @Mutation(() => Attribute)
  async createAttribute(@Args('data') data: CreateAttributeInput) {
    return this.attributesService.create(data);
  }

  @Mutation(() => Attribute)
  async updateAttribute(
    @Args('id', { type: () => ID }) id: string,
    @Args('data') data: UpdateAttributeInput,
  ) {
    return this.attributesService.update(id, data);
  }

  @Mutation(() => Attribute)
  async deleteAttribute(@Args('id', { type: () => ID }) id: string) {
    return this.attributesService.remove(id);
  }
}
