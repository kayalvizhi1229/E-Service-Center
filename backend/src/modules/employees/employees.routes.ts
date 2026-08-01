import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { parsePagination, paginatedResponse, generateCode } from '../../shared/utils.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN));

const employeeSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  role: z.string().optional(),
  salary: z.number().min(0).default(0),
  address: z.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.employee.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.employee.count(),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  })
);

router.post(
  '/',
  validateBody(employeeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const count = await prisma.employee.count();
    const employeeCode = await generateCode('EMP', count);
    const employee = await prisma.employee.create({
      data: { ...req.body, employeeCode, email: req.body.email || null },
    });
    res.status(201).json({ success: true, data: employee });
  })
);

router.put(
  '/:id',
  validateBody(employeeSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const employee = await prisma.employee.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });
    res.json({ success: true, data: employee });
  })
);

router.post(
  '/:id/attendance',
  validateBody(
    z.object({
      date: z.string(),
      status: z.string().default('PRESENT'),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: (req.params.id as string),
          date: new Date(req.body.date),
        },
      },
      create: {
        employeeId: (req.params.id as string),
        date: new Date(req.body.date),
        status: req.body.status,
        checkIn: req.body.checkIn,
        checkOut: req.body.checkOut,
      },
      update: {
        status: req.body.status,
        checkIn: req.body.checkIn,
        checkOut: req.body.checkOut,
      },
    });
    res.json({ success: true, data: attendance });
  })
);

export default router;
