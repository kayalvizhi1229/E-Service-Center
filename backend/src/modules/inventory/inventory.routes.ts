import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse } from '../../shared/utils.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.STORE_MANAGER));

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        skip,
        take: limit,
        include: {
          product: { include: { category: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.inventory.count(),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.get(
  '/low-stock',
  asyncHandler(async (_req: Request, res: Response) => {
    const inventory = await prisma.inventory.findMany({
      include: { product: true },
    });
    const lowStock = inventory.filter((i: any) => i.quantity <= i.product.minStock);
    res.json({ success: true, data: lowStock });
  })
);

router.get(
  '/expiry-alerts',
  asyncHandler(async (_req: Request, res: Response) => {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const alerts = await prisma.inventory.findMany({
      where: {
        expiryDate: { lte: in30Days, not: null },
        quantity: { gt: 0 },
      },
      include: { product: true },
    });
    res.json({ success: true, data: alerts });
  })
);

router.post(
  '/adjust',
  validateBody(
    z.object({
      inventoryId: z.string(),
      quantity: z.number().int(),
      notes: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const inv = await prisma.inventory.findUnique({ where: { id: req.body.inventoryId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Inventory not found' });

    const newQty = inv.quantity + req.body.quantity;
    if (newQty < 0) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    const updated = await prisma.inventory.update({
      where: { id: inv.id },
      data: { quantity: newQty },
    });

    await prisma.stockHistory.create({
      data: {
        inventoryId: inv.id,
        action: 'ADJUSTMENT',
        quantity: req.body.quantity,
        previousQty: inv.quantity,
        newQty,
        notes: req.body.notes,
      },
    });

    res.json({ success: true, data: updated });
  })
);

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.stockHistory.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: { include: { product: { select: { name: true, sku: true } } } },
        },
      }),
      prisma.stockHistory.count(),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

export default router;
