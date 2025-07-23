import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import walletRoutes from './routes/wallet.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import gamesRoutes from './routes/games.routes';
import bidsRoutes from './routes/bids.routes';
import notificationsRoutes from './routes/notifications.routes';
import cmsRoutes from './routes/cms.routes';
import bannersRoutes from './routes/banners.routes';
import dashboardRoutes from './routes/dashboard.routes';
import commissionRoutes from './routes/commission.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Load environment variables
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: [process.env.DASHBOARD_URL || ''],
  credentials: true,
}));
app.use(helmet());

app.get('/', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/wallet', withdrawalRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/commission', commissionRoutes);
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app; 