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
router.use(authenticate, requireRoles(Role.ADMIN, Role.OPERATOR));

const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  altMobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  village: z.string().optional(),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(req.query);
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { mobile: { contains: search } },
            { customerCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await prisma.customer.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        documents: true,
        services: { orderBy: { createdAt: 'desc' }, take: 20 },
        sales: { orderBy: { createdAt: 'desc' }, take: 20 },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  })
);

router.post(
  '/',
  validateBody(customerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.customer.count();
    const customerCode = await generateCode('CUS', count);
    const customer = await prisma.customer.create({
      data: { ...req.body, customerCode, email: req.body.email || null },
    });
    res.status(201).json({ success: true, data: customer });
  })
);

router.put(
  '/:id',
  validateBody(customerSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await prisma.customer.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json({ success: true, data: customer });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.customer.delete({ where: { id: (req.params.id as string) } });
    res.json({ success: true, message: 'Customer deleted' });
  })
);

router.post(
  '/:id/documents',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File required' });
    }
    const doc = await prisma.customerDocument.create({
      data: {
        customerId: (req.params.id as string),
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
      },
    });
    res.status(201).json({ success: true, data: doc });
  })
);

export default router;
