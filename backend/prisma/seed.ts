import { PrismaClient, Role, ExpenseCategory, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SERVICE_LIST = [
  { name: 'Aadhaar Related Services', department: 'Government' },
  { name: 'Passport', department: 'Government' },
  { name: 'PAN Card', department: 'Government' },
  { name: 'Money Transfer', department: 'Banking' },
  { name: 'AEPS Cash Withdrawal', department: 'Banking' },
  { name: 'ATM Withdrawal', department: 'Banking' },
  { name: 'Bank Account Opening', department: 'Banking' },
  { name: 'EB Bill Payment', department: 'Utility' },
  { name: 'Employment Registration', department: 'Government' },
  { name: 'Employment Renewal', department: 'Government' },
  { name: 'Student NAD Registration', department: 'Education' },
  { name: 'Family Card New', department: 'Government' },
  { name: 'Family Card Correction', department: 'Government' },
  { name: 'Family Head Change', department: 'Government' },
  { name: 'Address Change', department: 'Government' },
  { name: 'Community Certificate', department: 'Government' },
  { name: 'Income Certificate', department: 'Government' },
  { name: 'Nativity Certificate', department: 'Government' },
  { name: 'OBC Certificate', department: 'Government' },
  { name: 'Farmer Certificate', department: 'Government' },
  { name: 'Patta Transfer', department: 'Revenue' },
  { name: 'Legal Heir Certificate', department: 'Government' },
  { name: 'Old Age Pension', department: 'Social Welfare' },
  { name: 'Widow Pension', department: 'Social Welfare' },
  { name: 'Disability Pension', department: 'Social Welfare' },
  { name: 'Marriage Assistance', department: 'Social Welfare' },
  { name: 'FSSAI Certificate', department: 'Food Safety' },
  { name: 'Jeevan Pramaan', department: 'Government' },
  { name: 'Passport Size Photo', department: 'Print & Scan' },
  { name: 'Color Print', department: 'Print & Scan' },
  { name: 'Black and White Print', department: 'Print & Scan' },
  { name: 'Color Xerox', department: 'Print & Scan' },
  { name: 'Black and White Xerox', department: 'Print & Scan' },
  { name: 'Scanning', department: 'Print & Scan' },
  { name: 'Lamination', department: 'Print & Scan' },
  { name: 'Spiral Binding', department: 'Print & Scan' },
  { name: 'Online Applications', department: 'Digital Services' },
  { name: 'Government Form Filling', department: 'Digital Services' },
  { name: 'Online Payment Services', department: 'Digital Services' },
];

const PRODUCT_CATEGORIES = [
  'Groceries',
  'Stationery',
  'Electronics',
  'Household',
  'Personal Care',
  'Beverages',
];

async function main() {
  console.log('🌱 Seeding Yoga Infotech database...');

  const password = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123', 10);

  const users = [
    { email: 'admin@yogainfotech.com', name: 'Admin User', role: Role.ADMIN, phone: '9876543210' },
    { email: 'operator@yogainfotech.com', name: 'Service Operator', role: Role.OPERATOR, phone: '9876543211' },
    { email: 'cashier@yogainfotech.com', name: 'Store Cashier', role: Role.CASHIER, phone: '9876543212' },
    { email: 'manager@yogainfotech.com', name: 'Store Manager', role: Role.STORE_MANAGER, phone: '9876543213' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password },
    });
  }

  for (const svc of SERVICE_LIST) {
    await prisma.serviceCategory.upsert({
      where: { name: svc.name },
      update: { department: svc.department },
      create: svc,
    });
  }

  for (const cat of PRODUCT_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { name: cat },
      update: {},
      create: { name: cat },
    });
  }

  const settings = {
    businessName: 'Yoga Infotech',
    businessType: 'E-Service Center & Departmental Store',
    address: 'Periyapattu, Cuddalore, Tamil Nadu 608801',
    phone: '9876543210',
    email: 'info@yogainfotech.com',
    gstNumber: '33AAAAA0000A1Z5',
    invoicePrefix: 'YI',
    receiptPrefix: 'RC',
    currency: 'INR',
    theme: 'light',
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const categories = await prisma.productCategory.findMany();
  const groceries = categories.find((c) => c.name === 'Groceries')!;

  const supplier = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP00001' },
    update: {},
    create: {
      supplierCode: 'SUP00001',
      name: 'Cuddalore Wholesale Traders',
      contactPerson: 'Ravi Kumar',
      mobile: '9443123456',
      address: 'Cuddalore Main Road',
      gstNo: '33BBBBB0000B1Z5',
    },
  });

  const sampleProducts = [
    { name: 'Basmati Rice 1kg', sku: 'SKU00001', barcode: '8901234567890', mrp: 120, purchasePrice: 95, sellingPrice: 110, gst: 0 },
    { name: 'Sunflower Oil 1L', sku: 'SKU00002', barcode: '8901234567891', mrp: 180, purchasePrice: 150, sellingPrice: 165, gst: 5 },
    { name: 'Notebook A4', sku: 'SKU00003', barcode: '8901234567892', mrp: 60, purchasePrice: 40, sellingPrice: 55, gst: 12 },
    { name: 'Pen Blue Pack', sku: 'SKU00004', barcode: '8901234567893', mrp: 30, purchasePrice: 20, sellingPrice: 25, gst: 12 },
    { name: 'Detergent Powder 1kg', sku: 'SKU00005', barcode: '8901234567894', mrp: 150, purchasePrice: 110, sellingPrice: 130, gst: 18 },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        categoryId: groceries.id,
        supplierId: supplier.id,
        mrp: p.mrp,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstPercent: p.gst,
        minStock: 10,
        hsnCode: '1006',
      },
    });

    await prisma.inventory.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: undefined as unknown as string,
        productId: product.id,
        quantity: 50,
        rackLocation: 'A1',
      },
    }).catch(async () => {
      const existing = await prisma.inventory.findFirst({ where: { productId: product.id } });
      if (!existing) {
        await prisma.inventory.create({
          data: { productId: product.id, quantity: 50, rackLocation: 'A1' },
        });
      }
    });
  }

  const customers = [
    { customerCode: 'CUS00001', name: 'Murugan S', mobile: '9444111222', village: 'Periyapattu', address: 'Main Street' },
    { customerCode: 'CUS00002', name: 'Lakshmi R', mobile: '9444222333', village: 'Cuddalore', address: 'Temple Road' },
    { customerCode: 'CUS00003', name: 'Karthik V', mobile: '9444333444', village: 'Panruti', address: 'Market Area' },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { customerCode: c.customerCode },
      update: {},
      create: c,
    });
  }

  const operator = await prisma.user.findUnique({ where: { email: 'operator@yogainfotech.com' } });
  const serviceCat = await prisma.serviceCategory.findFirst({ where: { name: 'Aadhaar Related Services' } });
  const customer = await prisma.customer.findFirst({ where: { customerCode: 'CUS00001' } });

  if (operator && serviceCat && customer) {
    await prisma.service.upsert({
      where: { serviceCode: 'SRV00001' },
      update: {},
      create: {
        serviceCode: 'SRV00001',
        name: 'Aadhaar Update',
        categoryId: serviceCat.id,
        customerId: customer.id,
        assignedStaffId: operator.id,
        govtFee: 50,
        serviceCharge: 100,
        totalAmount: 150,
        status: 'IN_PROGRESS',
        applicationNo: 'AAD2026001',
      },
    });
  }

  await prisma.expense.createMany({
    data: [
      { category: ExpenseCategory.RENT, amount: 15000, description: 'Shop Rent - January' },
      { category: ExpenseCategory.ELECTRICITY, amount: 2500, description: 'EB Bill' },
      { category: ExpenseCategory.INTERNET, amount: 800, description: 'Broadband' },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { type: NotificationType.LOW_STOCK, title: 'Low Stock Alert', message: 'Some products are running low on stock', link: '/inventory' },
      { type: NotificationType.PENDING_SERVICE, title: 'Pending Services', message: 'You have pending service applications', link: '/services' },
      { type: NotificationType.TASK, title: 'Daily Tasks', message: 'Review today\'s service deliveries and stock', link: '/dashboard' },
    ],
  });

  const employee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP00001' },
    update: {},
    create: {
      employeeCode: 'EMP00001',
      name: 'Senthil Kumar',
      mobile: '9444555666',
      role: 'Operator',
      salary: 15000,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('📧 Admin: admin@yogainfotech.com / Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
