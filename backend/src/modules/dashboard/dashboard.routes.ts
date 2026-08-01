import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayIncome,
      todayExpense,
      monthIncome,
      monthExpense,
      pendingServices,
      completedServices,
      storeSalesToday,
      totalCustomers,
      totalProducts,
      lowStockProducts,
      todayOrders,
      recentCustomers,
      recentTransactions,
      upcomingServices,
    ] = await Promise.all([
      prisma.income.aggregate({
        where: { incomeDate: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { expenseDate: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { incomeDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { expenseDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.service.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.service.count({
        where: { status: 'COMPLETED', completedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true },
      }),
      prisma.customer.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventory.findMany({
        include: { product: true },
      }),
      prisma.sale.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.customer.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      prisma.service.findMany({
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        take: 5,
        orderBy: { createdAt: 'asc' },
        include: { customer: { select: { name: true, mobile: true } } },
      }),
    ]);

    const lowStock = lowStockProducts.filter(
      (inv: any) => inv.quantity <= inv.product.minStock
    ).length;

    const inventoryValue = lowStockProducts.reduce(
      (sum: number, inv: any) => sum + Number(inv.product.purchasePrice) * inv.quantity,
      0
    );

    const todayInc = Number(todayIncome._sum.amount || 0);
    const todayExp = Number(todayExpense._sum.amount || 0);
    const monthInc = Number(monthIncome._sum.amount || 0);
    const monthExp = Number(monthExpense._sum.amount || 0);

    res.json({
      success: true,
      data: {
        todayIncome: todayInc,
        todayExpense: todayExp,
        todayProfit: todayInc - todayExp,
        monthlyIncome: monthInc,
        monthlyExpense: monthExp,
        monthlyProfit: monthInc - monthExp,
        pendingServices,
        completedServices,
        departmentStoreSales: Number(storeSalesToday._sum.total || 0),
        inventoryValue,
        lowStockProducts: lowStock,
        todayOrders,
        totalCustomers,
        totalProducts,
        recentCustomers,
        recentTransactions,
        upcomingServices,
      },
    });
  })
);

router.get(
  '/charts',
  asyncHandler(async (_req: Request, res: Response) => {
    const days = 7;
    const salesChart = [];
    const revenueChart = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const [sales, services, income] = await Promise.all([
        prisma.sale.aggregate({
          where: { createdAt: { gte: date, lt: next } },
          _sum: { total: true },
          _count: true,
        }),
        prisma.service.count({
          where: { createdAt: { gte: date, lt: next } },
        }),
        prisma.income.aggregate({
          where: { incomeDate: { gte: date, lt: next } },
          _sum: { amount: true },
        }),
      ]);

      const label = date.toLocaleDateString('en-IN', { weekday: 'short' });
      salesChart.push({
        date: label,
        sales: Number(sales._sum.total || 0),
        orders: sales._count,
      });
      revenueChart.push({
        date: label,
        revenue: Number(income._sum.amount || 0),
        services,
      });
    }

    const serviceAnalytics = await prisma.service.groupBy({
      by: ['status'],
      _count: true,
    });

    const inventoryAnalytics = await prisma.productCategory.findMany({
      include: {
        products: {
          include: { inventory: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        salesChart,
        revenueChart,
        serviceAnalytics,
        inventoryAnalytics: inventoryAnalytics.map((cat: any) => ({
          name: cat.name,
          products: cat.products.length,
          stock: cat.products.reduce(
            (s: any, p: any) => s + p.inventory.reduce((a: any, i: any) => a + i.quantity, 0),
            0
          ),
        })),
      },
    });
  })
);

export default router;
