import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { Role, PaymentMethod } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.CASHIER));

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstPercent: z.number().min(0).default(0),
});

const saleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paidAmount: z.number().min(0),
  notes: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(req.query);
    const where = search
      ? { invoiceNo: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [data, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: { select: { id: true, name: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const sale = await prisma.sale.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        customer: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  })
);

router.post(
  '/',
  validateBody(saleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.sale.count();
    const invoiceNo = await generateCode('INV', count);

    let subtotal = 0;
    let gstAmount = 0;
    const saleItems = [];

    for (const item of req.body.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });
      if (!product) {
        return res.status(400).json({ success: false, message: `Product ${item.productId} not found` });
      }

      const available = product.inventory.reduce((s: any, i: any) => s + i.quantity, 0);
      if (available < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const lineTotal = item.unitPrice * item.quantity - item.discount;
      const lineGst = (lineTotal * item.gstPercent) / 100;
      subtotal += lineTotal;
      gstAmount += lineGst;

      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstPercent: item.gstPercent,
        total: lineTotal + lineGst,
      });

      let remaining = item.quantity;
      for (const inv of product.inventory) {
        if (remaining <= 0) break;
        const deduct = Math.min(inv.quantity, remaining);
        const newQty = inv.quantity - deduct;
        await prisma.inventory.update({ where: { id: inv.id }, data: { quantity: newQty } });
        await prisma.stockHistory.create({
          data: {
            inventoryId: inv.id,
            action: 'SALE',
            quantity: -deduct,
            previousQty: inv.quantity,
            newQty,
            reference: invoiceNo,
          },
        });
        remaining -= deduct;
      }
    }

    const total = subtotal + gstAmount - req.body.discount;
    const changeAmount = Math.max(0, req.body.paidAmount - total);

    const sale = await prisma.sale.create({
      data: {
        invoiceNo,
        customerId: req.body.customerId,
        subtotal,
        discount: req.body.discount,
        gstAmount,
        total,
        paymentMethod: req.body.paymentMethod,
        paidAmount: req.body.paidAmount,
        changeAmount,
        notes: req.body.notes,
        items: { create: saleItems },
        payments: {
          create: {
            amount: total,
            method: req.body.paymentMethod,
            customerId: req.body.customerId,
          },
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    await prisma.income.create({
      data: {
        type: 'STORE_SALES',
        amount: total,
        description: `Sale ${invoiceNo}`,
        reference: invoiceNo,
      },
    });

    res.status(201).json({ success: true, data: sale });
  })
);

export default router;
