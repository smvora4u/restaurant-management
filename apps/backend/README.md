# Restaurant Management Backend

A GraphQL API backend for restaurant management system built with Node.js, Express, Apollo Server, and MongoDB.

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection configuration
├── models/
│   ├── index.js            # Export all models
│   ├── MenuItem.js         # Menu item model
│   ├── Table.js            # Table model
│   ├── Order.js            # Order model
│   └── Reservation.js      # Reservation model
├── resolvers/
│   ├── index.js            # Export all resolvers
│   ├── queries.js          # GraphQL query resolvers
│   └── mutations.js        # GraphQL mutation resolvers
├── schema/
│   └── typeDefs.js         # GraphQL type definitions
├── utils/
│   └── seedData.js         # Database seeding utilities
└── index.js                # Main application entry point
```

## 🚀 Features

### Models
- **MenuItem**: Restaurant menu items with ingredients, allergens, pricing
- **Table**: Restaurant tables with capacity and status tracking
- **Order**: Customer orders with items and status management
- **Reservation**: Table reservations with customer information

### GraphQL API
- **Queries**: Fetch menu items, tables, orders, reservations
- **Mutations**: Create, update, delete operations for all entities
- **Real-time**: Apollo Server with hot reloading

### Database
- **MongoDB**: Document-based storage
- **Auto-seeding**: Sample data on first run
- **Validation**: Mongoose schema validation

## 🛠️ Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation
```bash
npm install
```

### Running
```bash
# Development with hot reload
npm run dev

# Production
npm start
```

### Environment Variables
```env
PORT=4000
MONGO_URL=mongodb://localhost:27017/restaurant
```

## 📊 GraphQL Playground

Visit `http://localhost:4000/graphql` to explore the API with GraphQL Playground.

### Sample Queries

```graphql
# Get all menu items
query {
  menuItems {
    id
    name
    price
    category
  }
}

# Get all tables
query {
  tables {
    id
    number
    capacity
    status
  }
}

# Create a new order
mutation {
  createOrder(input: {
    tableNumber: 1
    items: [{
      menuItemId: "ITEM_ID"
      quantity: 2
      price: 12.99
    }]
    totalAmount: 25.98
    customerName: "John Doe"
  }) {
    id
    totalAmount
  }
}
```

## 🔧 Architecture

### Modular Design
- **Separation of Concerns**: Models, resolvers, and schema in separate files
- **Maintainable**: Easy to add new features and modify existing ones
- **Scalable**: Clear structure for team development
- **Testable**: Individual modules can be unit tested

### Error Handling
- Global error handlers for uncaught exceptions
- Graceful MongoDB connection error handling
- Detailed error messages for development

### Data Seeding
- Automatic sample data creation on first run
- Prevents duplicate seeding
- Easy to modify sample data

## 🚀 Deployment

The application is ready for deployment with Docker. See `Dockerfile` and `docker-compose.yml` for containerized setup.

## 📝 API Documentation

Full GraphQL schema documentation is available in the GraphQL Playground at `http://localhost:4000/graphql`.