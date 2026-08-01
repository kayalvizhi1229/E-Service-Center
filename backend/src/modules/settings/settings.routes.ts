import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await prisma.setting.findMany();
    const data = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    res.json({ success: true, data });
  })
);

router.put(
  '/',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(z.record(z.string())),
  asyncHandler(async (req: Request, res: Response) => {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    res.json({ success: true, message: 'Settings updated' });
  })
);

router.get(
  '/search',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q || '');
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { customers: [], products: [], services: [] } });
    }

    const [customers, products, services] = await Promise.all([
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
          ],
        },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } },
          ],
          isActive: true,
        },
        take: 5,
      }),
      prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { serviceCode: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    res.json({ success: true, data: { customers, products, services } });
  })
);

export default router;
