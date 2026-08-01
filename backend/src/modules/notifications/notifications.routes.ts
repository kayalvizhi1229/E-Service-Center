import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unread === 'true';
    const notifications = await prisma.notification.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await prisma.notification.update({
      where: { id: (req.params.id as string) },
      data: { isRead: true },
    });
    res.json({ success: true, data: notification });
  })
);

router.patch(
  '/read-all',
  asyncHandler(async (_req: Request, res: Response) => {
    await prisma.notification.updateMany({ data: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  })
);

export default router;
