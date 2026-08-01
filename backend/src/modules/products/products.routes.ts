import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { upload } from '../../middleware/upload.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.STORE_MANAGER, Role.CASHIER));

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string(),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  supplierId: z.string().optional(),
  mrp: z.number().min(0),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstPercent: z.number().min(0).default(0),
  hsnCode: z.string().optional(),
  minStock: z.number().int().min(0).default(5),
  maxStock: z.number().int().optional(),
  openingStock: z.number().int().min(0).default(0),
  batchNo: z.string().optional(),
  expiryDate: z.string().optional(),
  rackLocation: z.string().optional(),
});

router.get(
  '/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.productCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  })
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(req.query);
    const where = search
      ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { barcode: { contains: search as string } },
            { sku: { contains: search as string, mode: 'insensitive' as const } },
          ],
          isActive: true,
        }
      : { isActive: true };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          supplier: { select: { id: true, name: true } },
          inventory: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const enriched = data.map((p: any) => ({
      ...p,
      availableStock: p.inventory.reduce((s: any, i: any) => s + i.quantity, 0),
    }));

    res.json(paginatedResponse(enriched, total, page, limit));
  })
);

router.get(
  '/barcode/:code',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ barcode: req.params.code as string }, { sku: req.params.code as string }],
        isActive: true,
      },
      include: { category: true, inventory: true },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({
      success: true,
      data: {
        ...product,
        availableStock: (product as any).inventory.reduce((s: any, i: any) => s + i.quantity, 0),
      },
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: (req.params.id as string) },
      include: { category: true, supplier: true, inventory: { include: { stockHistory: { take: 10, orderBy: { createdAt: 'desc' } } } } },
    });
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: product });
  })
);

router.post(
  '/',
  validateBody(productSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.product.count();
    const sku = req.body.sku || (await generateCode('SKU', count));
    const { openingStock, batchNo, expiryDate, rackLocation, ...productData } = req.body;

    const product = await prisma.product.create({
      data: { ...productData, sku },
    });

    if (openingStock > 0) {
      const inv = await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity: openingStock,
          batchNo,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          rackLocation,
        },
      });
      await prisma.stockHistory.create({
        data: {
          inventoryId: inv.id,
          action: 'ADJUSTMENT',
          quantity: openingStock,
          previousQty: 0,
          newQty: openingStock,
          notes: 'Opening stock',
        },
      });
    }

    res.status(201).json({ success: true, data: product });
  })
);

router.put(
  '/:id',
  validateBody(productSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await prisma.product.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json({ success: true, data: product });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.product.update({
      where: { id: (req.params.id as string) },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Product deactivated' });
  })
);

router.post(
  '/:id/image',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const product = await prisma.product.update({
      where: { id: (req.params.id as string) },
      data: { imageUrl: `/uploads/${req.file.filename}` },
    });
    res.json({ success: true, data: product });
  })
);

export default router;
