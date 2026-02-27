jest.mock('../../common/prisma/prisma.service.js', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

import { ShippingAddressesService } from './shipping-addresses.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const ADDRESS_ID = 'address-1';
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

const mockAddress = (overrides: Record<string, unknown> = {}) => ({
  id: ADDRESS_ID,
  userId: USER_ID,
  fullName: 'John Doe',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'Springfield',
  state: 'IL',
  postalCode: '62701',
  country: 'US',
  createdAt: FIXED_DATE,
  updatedAt: FIXED_DATE,
  ...overrides,
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ShippingAddressesService', () => {
  let service: ShippingAddressesService;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingAddressesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ShippingAddressesService>(ShippingAddressesService);
  });

  // ── findAllForUser ────────────────────────────────────────────────────────

  describe('findAllForUser', () => {
    it('should return all addresses for a user ordered by createdAt desc', async () => {
      const addresses = [mockAddress(), mockAddress({ id: 'address-2' })];
      prismaMock.shippingAddress.findMany.mockResolvedValue(addresses as any);

      const result = await service.findAllForUser(USER_ID);

      expect(prismaMock.shippingAddress.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(addresses);
    });

    it('should return an empty array when user has no addresses', async () => {
      prismaMock.shippingAddress.findMany.mockResolvedValue([]);

      const result = await service.findAllForUser(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create an address associated with the user and return it', async () => {
      const input = {
        fullName: 'John Doe',
        addressLine1: '123 Main St',
        addressLine2: null,
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        country: 'US',
      };
      const address = mockAddress();
      prismaMock.shippingAddress.create.mockResolvedValue(address as any);

      const result = await service.create(USER_ID, input as any);

      expect(prismaMock.shippingAddress.create).toHaveBeenCalledWith({
        data: { ...input, userId: USER_ID },
      });
      expect(result).toEqual(address);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const input = { id: ADDRESS_ID, city: 'Shelbyville' };

    it('should update the address when it belongs to the user', async () => {
      const updated = mockAddress({ city: 'Shelbyville' });
      prismaMock.shippingAddress.findUnique.mockResolvedValue(mockAddress() as any);
      prismaMock.shippingAddress.update.mockResolvedValue(updated as any);

      const result = await service.update(USER_ID, input as any);

      expect(prismaMock.shippingAddress.update).toHaveBeenCalledWith({
        where: { id: ADDRESS_ID },
        data: { city: 'Shelbyville' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when address does not exist', async () => {
      prismaMock.shippingAddress.findUnique.mockResolvedValue(null);

      await expect(service.update(USER_ID, input as any)).rejects.toThrow(
        new NotFoundException(`Shipping address "${ADDRESS_ID}" not found.`),
      );
      expect(prismaMock.shippingAddress.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when address belongs to another user', async () => {
      prismaMock.shippingAddress.findUnique.mockResolvedValue(
        mockAddress({ userId: OTHER_USER_ID }) as any,
      );

      await expect(service.update(USER_ID, input as any)).rejects.toThrow(
        new ForbiddenException(
          'You do not have permission to modify this address.',
        ),
      );
      expect(prismaMock.shippingAddress.update).not.toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete the address when it belongs to the user', async () => {
      const address = mockAddress();
      prismaMock.shippingAddress.findUnique.mockResolvedValue(address as any);
      prismaMock.shippingAddress.delete.mockResolvedValue(address as any);

      const result = await service.remove(USER_ID, ADDRESS_ID);

      expect(prismaMock.shippingAddress.delete).toHaveBeenCalledWith({
        where: { id: ADDRESS_ID },
      });
      expect(result).toEqual(address);
    });

    it('should throw NotFoundException when address does not exist', async () => {
      prismaMock.shippingAddress.findUnique.mockResolvedValue(null);

      await expect(service.remove(USER_ID, ADDRESS_ID)).rejects.toThrow(
        new NotFoundException(`Shipping address "${ADDRESS_ID}" not found.`),
      );
      expect(prismaMock.shippingAddress.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when address belongs to another user', async () => {
      prismaMock.shippingAddress.findUnique.mockResolvedValue(
        mockAddress({ userId: OTHER_USER_ID }) as any,
      );

      await expect(service.remove(USER_ID, ADDRESS_ID)).rejects.toThrow(
        new ForbiddenException(
          'You do not have permission to modify this address.',
        ),
      );
      expect(prismaMock.shippingAddress.delete).not.toHaveBeenCalled();
    });
  });
});
