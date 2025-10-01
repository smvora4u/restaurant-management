import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';

// Import our modular components
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { connectMongo } from './config/database.js';
import { seedInitialData } from './utils/seedData.js';
import { fixTableIndexes } from './utils/fixTableIndexes.js';
import { authenticateUser, AuthContext } from './middleware/auth.js';

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
    
    // Middleware
    app.use(cors());
    app.use(bodyParser.json());

    // Create GraphQL schema
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    
    // Create Apollo Server
    const server = new ApolloServer({ 
      schema
    });
    await server.start();

    // Apply GraphQL middleware
    app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }): Promise<AuthContext> => {
        return await authenticateUser(req);
      }
    }) as any);

    // Start server
    const port = Number(process.env.PORT) || 4000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Backend running on http://0.0.0.0:${port}/graphql`);
      console.log(`📊 GraphQL Playground available at http://localhost:${port}/graphql`);
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