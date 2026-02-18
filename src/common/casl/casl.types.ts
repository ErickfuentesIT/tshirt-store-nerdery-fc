import { MongoAbility, InferSubjects } from '@casl/ability';
import { Product } from '../../modules/products/models/product.model.js';
import { ProductVariant } from '../../modules/products/models/product-variant.model.js';
import { Category } from '../../modules/categories/models/category.model.js';
import { AttributeCategory } from '../../modules/products/models/attribute-category.model.js';
import { Attribute } from '../../modules/products/models/attribute.model.js';
import { Image } from '../../modules/products/models/image.model.js';

export enum Action {
  Manage = 'manage',
  Read   = 'read',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export type Subjects = InferSubjects<
  | typeof Product
  | typeof ProductVariant
  | typeof Category
  | typeof AttributeCategory
  | typeof Attribute
  | typeof Image
> | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;
