import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import our modular components
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { connectMongo } from './config/database.js';
import { seedInitialData } from './utils/seedData.js';
import { fixTableIndexes } from './utils/fixTableIndexes.js';
import { authenticateUser, AuthContext } from './middleware/auth.js';
import { pubsub } from './resolvers/subscriptions.js';
import { Settlement, FeeLedger } from './models/index.js';
import { useServer } from 'graphql-ws/use/ws';

async function start() {
  try {
    // Connect to MongoDB
    await connectMongo();
    
    // Fix table indexes to prevent duplicate key errors
    await fixTableIndexes();
    
    // Seed initial data
    await seedInitialData();

    // Create Express app
    const app = express();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Middleware
    app.use(cors());
    app.use(bodyParser.json());

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

    // Create WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
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