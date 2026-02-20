import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

// Import our modular components
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { connectMongo } from './config/database.js';
import { seedInitialData } from './utils/seedData.js';
import { fixTableIndexes } from './utils/fixTableIndexes.js';
import { backfillPaidAt } from './utils/backfillPaidAt.js';
import { backfillPurchaseDate } from './utils/backfillPurchaseDate.js';
import { backfillMenuCategories } from './utils/backfillMenuCategories.js';
import { authenticateUser, AuthContext } from './middleware/auth.js';
import { pubsub } from './resolvers/subscriptions.js';
import { Settlement, FeeLedger } from './models/index.js';
import { useServer } from 'graphql-ws/use/ws';
import { registerProxy, unregisterByWebSocket } from './services/printerProxy.js';
import jwt from 'jsonwebtoken';

async function start() {
  try {
    // Connect to MongoDB
    await connectMongo();
    
    // Fix table indexes to prevent duplicate key errors
    await fixTableIndexes();
    
    // Backfill paidAt for old payments
    await backfillPaidAt();

    // Backfill purchaseDate for old purchases
    await backfillPurchaseDate();

    // Backfill menu categoryId from legacy category strings
    await backfillMenuCategories();
    
    // Seed initial data
    await seedInitialData();

    // Create Express app
    const app = express();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Get __dirname equivalent for ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Ensure uploads directory exists
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Configure multer for file uploads
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'menu-item-' + uniqueSuffix + ext);
      }
    });
    
    const upload = multer({
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
          return cb(null, true);
        } else {
          cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
        }
      }
    });

    // CORS configuration
    const allowedOrigins = [
      'https://www.restrowise.com',
      'https://restrowise.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
    ];

    // Add environment variable for additional origins if needed
    if (process.env.ALLOWED_ORIGINS) {
      const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
      allowedOrigins.push(...additionalOrigins);
    }

    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // In development, allow all origins for easier testing
          if (process.env.NODE_ENV !== 'production') {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-restaurant-id', 'x-restaurant-slug'],
      exposedHeaders: ['Content-Type'],
    };

    app.use(cors(corsOptions));
    
    // Handle preflight OPTIONS requests explicitly
    app.options('*', cors(corsOptions));
    
    // Middleware
    app.use(bodyParser.json());
    
    // Serve uploaded files statically
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Create GraphQL schema
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    
    // Create Apollo Server
    const server = new ApolloServer({ 
      schema,
      plugins: [
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await server.stop();
              },
            };
          },
        },
      ],
    });
    await server.start();

    // Create WebSocket servers - we handle upgrade manually to support multiple paths
    const wsServer = new WebSocketServer({ noServer: true });
    const printerProxyWss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === '/printer-proxy') {
        printerProxyWss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          const token = url.searchParams.get('token');
          const restaurantId = url.searchParams.get('restaurantId');
          if (!token || !restaurantId) {
            ws.close(4000, 'Missing token or restaurantId');
            return;
          }
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            const id = decoded.restaurantId || decoded.staffId && (decoded as any).restaurantId;
            if (!id || String(id) !== String(restaurantId)) {
              ws.close(4001, 'Invalid token for restaurant');
              return;
            }
            registerProxy(restaurantId, ws);
            ws.on('close', () => unregisterByWebSocket(ws));
            ws.on('error', () => unregisterByWebSocket(ws));
          } catch {
            ws.close(4001, 'Invalid token');
          }
        });
      } else if (url.pathname === '/graphql') {
        wsServer.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          wsServer.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // Use the WebSocket server for GraphQL subscriptions
    useServer({
      schema,
      context: async (ctx: any) => {
        // Extract authentication from connection params
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            
            if (decoded.restaurantId) {
              return { restaurant: { id: decoded.restaurantId, email: decoded.email, slug: decoded.slug } };
            } else if (decoded.adminId) {
              return { admin: { id: decoded.adminId, email: decoded.email, role: decoded.role, permissions: decoded.permissions } };
            } else if (decoded.staffId) {
              return { staff: { id: decoded.staffId, email: decoded.email, role: decoded.role, permissions: decoded.permissions, restaurantId: decoded.restaurantId } };
            }
          } catch (error) {
            console.error('WebSocket authentication error:', error);
          }
        }
        
        // For consumer connections, check restaurant context
        const restaurantId = ctx.connectionParams?.['x-restaurant-id'];
        const restaurantSlug = ctx.connectionParams?.['x-restaurant-slug'];
        
        if (restaurantId && restaurantSlug) {
          return { restaurant: { id: restaurantId, slug: restaurantSlug } };
        }
        
        return {};
      },
    }, wsServer);

    // Apply GraphQL middleware
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }): Promise<AuthContext> => {
        return await authenticateUser(req);
      }
    }) as any);

    // File upload endpoint for menu item images
    app.post('/api/upload/image', upload.single('image') as any, (req: express.Request, res: express.Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return the URL to access the uploaded file
        const fileUrl = `/uploads/${req.file.filename}`;
        return res.json({ url: fileUrl });
      } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: error.message || 'Failed to upload file' });
      }
    });

    // Settlement PDF endpoint (server-side PDF generation)
    app.get('/settlements/:id/pdf', async (req, res) => {
      try {
        const id = req.params.id;
        const settlement = await Settlement.findById(id);
        if (!settlement) {
          res.status(404).send('Settlement not found');
          return;
        }
        const { restaurantId, periodStart, periodEnd, currency } = settlement as any;
        const ledgers = await FeeLedger.find({
          restaurantId,
          createdAt: { $gte: new Date(periodStart), $lt: new Date(periodEnd) }
        }).sort({ createdAt: 1 });

        const PDFDocument = (await import('pdfkit')).default as any;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=settlement-${id}.pdf`);
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(res);

        // Header
        doc.fontSize(18).text('Weekly Settlement Statement', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Settlement ID: ${id}`);
        doc.text(`Restaurant ID: ${restaurantId}`);
        doc.text(`Period: ${new Date(periodStart as any).toISOString().slice(0,10)} to ${new Date(periodEnd as any).toISOString().slice(0,10)}`);
        doc.text(`Generated: ${new Date((settlement as any).generatedAt).toISOString()}`);
        doc.moveDown();

        // Summary
        doc.fontSize(12).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10)
          .text(`Total Orders: ${(settlement as any).totalOrders}`)
          .text(`Total Order Amount: ${currency} ${Number((settlement as any).totalOrderAmount).toFixed(2)}`)
          .text(`Total Fees: ${currency} ${Number((settlement as any).totalFees).toFixed(2)}`);
        doc.moveDown();

        // Table header
        const startX = 50;
        const colWidths = [90, 100, 120, 100, 60];
        const headers = ['Date', 'Order ID', 'Order Total', 'Fee Amount', 'Discount'];
        doc.fontSize(11).fillColor('black');
        let y = doc.y;
        headers.forEach((h, i) => {
          doc.text(h, startX + colWidths.slice(0,i).reduce((a,b)=>a+b,0), y, { width: colWidths[i] });
        });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').stroke();
        doc.moveDown(0.3);

        // Rows
        doc.fontSize(9).fillColor('black');
        ledgers.forEach((l: any) => {
          const row = [
            new Date(l.createdAt as any).toISOString().slice(0,10),
            String(l.orderId).slice(-8),
            `${currency} ${Number(l.orderTotal).toFixed(2)}`,
            `${currency} ${Number(l.feeAmount).toFixed(2)}`,
            l.discountApplied ? 'Yes' : 'No'
          ];
          const rowY = doc.y;
          row.forEach((val, i) => {
            doc.text(val, startX + colWidths.slice(0,i).reduce((a,b)=>a+b,0), rowY, { width: colWidths[i] });
          });
          doc.moveDown(0.2);
        });

        doc.end();
      } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).send('Failed to generate PDF');
      }
    });

    // Start server
    const port = Number(process.env.PORT) || 4000;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Backend running on http://0.0.0.0:${port}/graphql`);
      console.log(`📊 GraphQL Playground available at http://localhost:${port}/graphql`);
      console.log(`🔌 WebSocket subscriptions available at ws://localhost:${port}/graphql`);
    });

  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
start();