import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Stable UUIDs let us run the seed multiple times safely via upsert.
// Fields that lack a @unique constraint cannot be used in `where:`,
// so we pin the id instead.
const IDS = {
  CATEGORY: '00000000-0000-0000-0000-000000000010',
  PRODUCT:  '00000000-0000-0000-0000-000000000020',
  CAMPAIGN: '00000000-0000-0000-0000-000000000030',
} as const;

async function main() {
  console.log('🌱 Starting database seed...');

  // ── 1. Password ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ── 2. Users ──────────────────────────────────────────────────────────────
  // Field notes:
  //   - column is `password_hash`, Prisma field is `passwordHash`
  //   - `username` is required (no default)
  //   - `firstName`/`lastName` do NOT exist in the schema
  //   - UserRole enum values: manager | client | delivery  (not delivery_person)
  await prisma.user.upsert({
    where: { email: 'manager@store.com' },
    update: {},
    create: {
      email:        'manager@store.com',
      username:     'alice_admin',
      passwordHash,
      role:         'manager',
    },
  });

  await prisma.user.upsert({
    where: { email: 'client@store.com' },
    update: {},
    create: {
      email:        'client@store.com',
      username:     'bob_buyer',
      passwordHash,
      role:         'client',
    },
  });

  await prisma.user.upsert({
    where: { email: 'driver@store.com' },
    update: {},
    create: {
      email:        'driver@store.com',
      username:     'charlie_courier',
      passwordHash,
      role:         'delivery',        // ← enum value is 'delivery', not 'delivery_person'
    },
  });

    await prisma.user.upsert({
    where: { email: 'josealvarez@ravn.co' },
    update: {},
    create: {
      email:        'josealvarez@ravn.co',
      username:     'josepo_buyer',
      passwordHash,
      role:         'client',        // ← enum value is 'delivery', not 'delivery_person'
    },
  });

  // ── 3. Category ───────────────────────────────────────────────────────────
  // `name` is NOT @unique, so we upsert on `id`.
  // `description` does NOT exist on the Category model.
  const category = await prisma.category.upsert({
    where:  { id: IDS.CATEGORY },
    update: {},
    create: { id: IDS.CATEGORY, name: 'T-Shirts' },
  });

  // ── 4. Product & Variants ─────────────────────────────────────────────────
  // `name` is NOT @unique, so we upsert on `id`.
  // `basePrice` is required.
  // `imageUrls` does NOT exist on ProductVariant — images live in the Image
  // model and are normally uploaded via S3, so we skip them here.
  const product = await prisma.product.upsert({
    where:  { id: IDS.PRODUCT },
    update: {},
    create: {
      id:          IDS.PRODUCT,
      name:        'RAVN Exclusive Trainee T-Shirt',
      description: 'The official uniform for surviving long coding sessions.',
      basePrice:   2500, // $25.00 in cents
      categoryId:  category.id,
      isActive:    true,
      variants: {
        create: [
          {
            sku:        'RAVN-TSHIRT-BLK-M',
            priceCents: 2500,
            stock:      50,
          },
          {
            sku:        'RAVN-TSHIRT-WHT-L',
            priceCents: 2500,
            stock:      3, // Low stock — great for testing the BullMQ notification!
          },
        ],
      },
    },
  });

  // ── 5. Campaign & Promo Code ──────────────────────────────────────────────
  const campaign = await prisma.campaign.upsert({
    where:  { id: IDS.CAMPAIGN },
    update: {},
    create: {
      id:          IDS.CAMPAIGN,
      name:        'Launch Week Sale',
      description: 'Discounts for our first wave of users.',
    },
  });

  // Store-wide code (no applications = applies to every item in the cart).
  await prisma.promoCode.upsert({
    where:  { code: 'LAUNCH20' },
    update: {},
    create: {
      code:                  'LAUNCH20',
      campaignId:            campaign.id,
      discountType:          'PERCENTAGE',
      discountValue:         20,
      expirationDate:        new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      usageLimit:            100,
      minPurchaseAmountCents: 2000, // Minimum $20 spend
    },
  });

  // Product-scoped code (applies only to the seeded product's variants).
  await prisma.promoCode.upsert({
    where:  { code: 'RAVN10' },
    update: {},
    create: {
      code:          'RAVN10',
      campaignId:    campaign.id,
      discountType:  'FIXED',
      discountValue: 500, // $5.00 off
      expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      applications: {
        create: [{ productId: product.id }], // productVariantId null = all variants
      },
    },
  });

  console.log('✅ Seeding complete!');
  console.log('-------------------------------------------');
  console.log('🧑‍💼 Manager : manager@store.com  / Password123!');
  console.log('🛒 Client  : client@store.com   / Password123!');
  console.log('🛒 Client  : josealvarez@ravn.co   / Password123!');
  console.log('🚚 Driver  : driver@store.com   / Password123!');
  console.log('🏷️  Promo   : LAUNCH20 (20% off, store-wide, min $20)');
  console.log('🏷️  Promo   : RAVN10   ($5 off RAVN T-Shirt)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
