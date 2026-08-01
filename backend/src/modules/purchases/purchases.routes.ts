import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.STORE_MANAGER));

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  gstPercent: z.number().min(0).default(0),
});

const purchaseSchema = z.object({
  supplierId: z.string(),
  items: z.array(purchaseItemSchema).min(1),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.purchase.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.purchase.count(),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.post(
  '/',
  validateBody(purchaseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.purchase.count();
    const purchaseNo = await generateCode('PO', count);

    let subtotal = 0;
    let gstAmount = 0;
    const items = [];

    for (const item of req.body.items) {
      const lineTotal = item.unitPrice * item.quantity;
      const lineGst = (lineTotal * item.gstPercent) / 100;
      subtotal += lineTotal;
      gstAmount += lineGst;
      items.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gstPercent: item.gstPercent,
        total: lineTotal + lineGst,
      });

      const existingInv = await prisma.inventory.findFirst({
        where: { productId: item.productId },
      });

      if (existingInv) {
        const newQty = existingInv.quantity + item.quantity;
        await prisma.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: newQty },
        });
        await prisma.stockHistory.create({
          data: {
            inventoryId: existingInv.id,
            action: 'PURCHASE',
            quantity: item.quantity,
            previousQty: existingInv.quantity,
            newQty,
            reference: purchaseNo,
          },
        });
      } else {
        const inv = await prisma.inventory.create({
          data: { productId: item.productId, quantity: item.quantity },
        });
        await prisma.stockHistory.create({
          data: {
            inventoryId: inv.id,
            action: 'PURCHASE',
            quantity: item.quantity,
            previousQty: 0,
            newQty: item.quantity,
            reference: purchaseNo,
          },
        });
      }
    }

    const total = subtotal + gstAmount;
    const outstanding = total - req.body.paidAmount;

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNo,
        supplierId: req.body.supplierId,
        subtotal,
        gstAmount,
        total,
        paidAmount: req.body.paidAmount,
        notes: req.body.notes,
        items: { create: items },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });

    await prisma.supplier.update({
      where: { id: req.body.supplierId },
      data: { outstanding: { increment: outstanding } },
    });

    res.status(201).json({ success: true, data: purchase });
  })
);

export default router;
