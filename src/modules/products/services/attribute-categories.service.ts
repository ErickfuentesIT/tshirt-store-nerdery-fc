import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { UpdateAttributeCategoryInput } from '../dto/update-attribute-category.input.js';
import { InsertAttributesWithCategoryInput } from '../dto/insert-attributes-with-category.input.js';
import { slugify } from '../helper/slugify.helper.js';

@Injectable()
export class AttributeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    attributes: true,
  };

  async findAll() {
    return this.prisma.attributeCategory.findMany({
      include: this.includeRelations,
    });
  }

  async findOne(id: string) {
    const attributeCategory = await this.prisma.attributeCategory.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!attributeCategory) {
      throw new NotFoundException(
        `Attribute category with ID "${id}" not found`,
      );
    }

    return attributeCategory;
  }

  async update(id: string, data: UpdateAttributeCategoryInput) {
    await this.findOne(id);

    return this.prisma.attributeCategory.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.prisma.attributeCategory.delete({
      where: { id },
    });
  }

  /**
   * This method handles two possible cases:
   * Case A (create new): provide `name` + `values` → creates AttributeCategory + child Attributes.
   * Case B (append to existing): provide `attributeCategoryId` + `values` → appends child Attributes.
   */
  async insertAttributesWithCategory(data: InsertAttributesWithCategoryInput) {
    const { attributeCategoryId, name, values } = data;

    if (!attributeCategoryId && !name) {
      throw new BadRequestException(
        'Provide either name (Case A: new category) or attributeCategoryId (Case B: existing category).',
      );
    }
    if (attributeCategoryId && name) {
      throw new BadRequestException(
        'Provide either name or attributeCategoryId, not both.',
      );
    }
    // code is derived from displayName at creation time and never changes.
    // SKU generation depends on code, so displayName renames never affect SKUs.
    const attributeData = values.map((displayName) => ({
      code: slugify(displayName),
      displayName,
    }));

    return this.prisma.$transaction(async (tx) => {
      if (attributeCategoryId) {
        // Case B: existing parent → verify it exists, then append children
        const existing = await tx.attributeCategory.findUnique({
          where: { id: attributeCategoryId },
        });

        if (!existing) {
          throw new NotFoundException(
            `Attribute category with ID "${attributeCategoryId}" not found`,
          );
        }

        await tx.attribute.createMany({
          data: attributeData.map((a) => ({
            ...a,
            attributeCategoryId,
          })),
        });

        return tx.attributeCategory.findUnique({
          where: { id: attributeCategoryId },
          include: this.includeRelations,
        });
      }

      // Case A: create new parent with nested children
      return tx.attributeCategory.create({
        data: {
          name: name as string,
          attributes: {
            createMany: { data: attributeData },
          },
        },
        include: this.includeRelations,
      });
    });
  }
}
