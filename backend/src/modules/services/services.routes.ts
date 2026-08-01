import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { Role, ServiceStatus } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN, Role.OPERATOR));

const serviceSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string(),
  customerId: z.string(),
  govtFee: z.number().min(0).default(0),
  serviceCharge: z.number().min(0).default(0),
  documentsRequired: z.string().optional(),
  assignedStaffId: z.string().optional(),
  remarks: z.string().optional(),
  applicationNo: z.string().optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
});

router.get(
  '/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: categories });
  })
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, sortBy, sortOrder, skip } = parsePagination(req.query);
    const status = (req.query.status as string) as ServiceStatus | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serviceCode: { contains: search, mode: 'insensitive' } },
        { applicationNo: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          category: true,
          assignedStaff: { select: { id: true, name: true } },
        },
      }),
      prisma.service.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const service = await prisma.service.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        customer: true,
        category: true,
        assignedStaff: { select: { id: true, name: true } },
        payments: true,
      },
    });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, data: service });
  })
);

router.post(
  '/',
  validateBody(serviceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.service.count();
    const serviceCode = await generateCode('SRV', count);
    const totalAmount = req.body.govtFee + req.body.serviceCharge;
    const service = await prisma.service.create({
      data: {
        ...req.body,
        serviceCode,
        totalAmount,
      },
      include: { customer: true, category: true },
    });

    await prisma.income.create({
      data: {
        type: 'SERVICE',
        amount: totalAmount,
        description: `Service: ${service.name}`,
        reference: service.serviceCode,
      },
    });

    res.status(201).json({ success: true, data: service });
  })
);

router.patch(
  '/:id/status',
  validateBody(z.object({ status: z.nativeEnum(ServiceStatus) })),
  asyncHandler(async (req: Request, res: Response) => {
    const data: { status: ServiceStatus; completedAt?: Date } = { status: req.body.status };
    if (req.body.status === 'COMPLETED') data.completedAt = new Date();
    const service = await prisma.service.update({
      where: { id: (req.params.id as string) },
      data,
    });
    res.json({ success: true, data: service });
  })
);

router.put(
  '/:id',
  validateBody(serviceSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.service.findUnique({ where: { id: (req.params.id as string) } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    const govtFee = req.body.govtFee ?? Number(existing.govtFee);
    const serviceCharge = req.body.serviceCharge ?? Number(existing.serviceCharge);

    const service = await prisma.service.update({
      where: { id: (req.params.id as string) },
      data: { ...req.body, totalAmount: govtFee + serviceCharge },
    });
    res.json({ success: true, data: service });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.service.delete({ where: { id: (req.params.id as string) } });
    res.json({ success: true, message: 'Service deleted' });
  })
);

export default router;
