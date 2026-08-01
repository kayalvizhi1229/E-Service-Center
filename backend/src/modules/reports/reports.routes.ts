import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, requireRoles } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate, requireRoles(Role.ADMIN));

function dateRange(query: Record<string, unknown>) {
  const from = query.from ? new Date(String(query.from)) : new Date(new Date().setDate(1));
  const to = query.to ? new Date(String(query.to)) : new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

router.get(
  '/daily',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = dateRange(req.query);
    const [income, expense, sales, services] = await Promise.all([
      prisma.income.aggregate({ where: { incomeDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { expenseDate: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { items: true } }),
      prisma.service.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    ]);

    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);

    res.json({
      success: true,
      data: {
        period: { from, to },
        income: totalIncome,
        expense: totalExpense,
        profit: totalIncome - totalExpense,
        salesCount: sales.length,
        servicesCount: services.length,
        sales,
        services,
      },
    });
  })
);

router.get(
  '/inventory',
  asyncHandler(async (_req: Request, res: Response) => {
    const inventory = await prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
    });
    res.json({ success: true, data: inventory });
  })
);

router.get(
  '/sales',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = dateRange(req.query);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } }, customer: true },
    });
    const total = sales.reduce((s: any, sale: any) => s + Number(sale.total), 0);
    res.json({ success: true, data: { sales, total } });
  })
);

router.get(
  '/services',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = dateRange(req.query);
    const services = await prisma.service.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { customer: true, category: true },
    });
    const total = services.reduce((s: any, svc: any) => s + Number(svc.totalAmount), 0);
    res.json({ success: true, data: { services, total } });
  })
);

router.get(
  '/profit-loss',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = dateRange(req.query);
    const [income, expense] = await Promise.all([
      prisma.income.groupBy({
        by: ['type'],
        where: { incomeDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { expenseDate: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = income.reduce((s: any, i: any) => s + Number(i._sum.amount || 0), 0);
    const totalExpense = expense.reduce((s: any, e: any) => s + Number(e._sum.amount || 0), 0);

    res.json({
      success: true,
      data: {
        period: { from, to },
        income,
        expense,
        totalIncome,
        totalExpense,
        profit: totalIncome - totalExpense,
      },
    });
  })
);

router.get(
  '/gst',
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = dateRange(req.query);
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: true },
    });
    const totalGst = sales.reduce((s: any, sale: any) => s + Number(sale.gstAmount), 0);
    res.json({ success: true, data: { sales, totalGst } });
  })
);

export default router;
