import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

// Import our modular components
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { connectMongo } from './config/database.js';
import { seedInitialData } from './utils/seedData.js';
import { fixTableIndexes } from './utils/fixTableIndexes.js';
import { authenticateUser, AuthContext } from './middleware/auth.js';
import { pubsub } from './resolvers/subscriptions.js';

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
      context: async (ctx) => {
        // Extract authentication from connection params
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            
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