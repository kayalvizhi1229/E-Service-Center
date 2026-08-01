import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authenticate, signToken, requireRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { Role } from '@prisma/client';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });
    res.json({ success: true, data: user });
  })
);

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.nativeEnum(Role),
  phone: z.string().optional(),
});

router.get(
  '/users',
  authenticate,
  requireRoles(Role.ADMIN),
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  })
);

router.post(
  '/users',
  authenticate,
  requireRoles(Role.ADMIN),
  validateBody(userSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: { ...req.body, password: hashed },
      select: { id: true, email: true, name: true, role: true, phone: true },
    });
    res.status(201).json({ success: true, data: user });
  })
);

export default router;
