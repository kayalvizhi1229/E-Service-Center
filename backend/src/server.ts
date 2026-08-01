import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import customerRoutes from './modules/customers/customers.routes.js';
import serviceRoutes from './modules/services/services.routes.js';
import productRoutes from './modules/products/products.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import supplierRoutes from './modules/suppliers/suppliers.routes.js';
import purchaseRoutes from './modules/purchases/purchases.routes.js';
import expenseRoutes from './modules/expenses/expenses.routes.js';
import incomeRoutes from './modules/income/income.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(config.uploadDir));

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yoga Infotech API',
      version: '1.0.0',
      description: 'E-Service Center & Departmental Store Management API',
    },
    servers: [{ url: `http://localhost:${config.port}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.ts'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Yoga Infotech API is running' });
});

const api = express.Router();
api.use('/auth', authRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/customers', customerRoutes);
api.use('/services', serviceRoutes);
api.use('/products', productRoutes);
api.use('/inventory', inventoryRoutes);
api.use('/sales', salesRoutes);
api.use('/suppliers', supplierRoutes);
api.use('/purchases', purchaseRoutes);
api.use('/expenses', expenseRoutes);
api.use('/income', incomeRoutes);
api.use('/employees', employeeRoutes);
api.use('/reports', reportRoutes);
api.use('/notifications', notificationRoutes);
api.use('/settings', settingsRoutes);

app.use('/api/v1', api);
app.use(errorHandler);

app.listen(config.port, "0.0.0.0", () => {
  console.log(`🚀 Yoga Infotech API running on http://localhost:${config.port}`);
  console.log(`📚 API Docs: http://localhost:${config.port}/api/docs`);
});

export default app;
