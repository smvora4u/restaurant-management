export const typeDefs = `#graphql
  type Health {
    ok: Boolean!
    mongo: Boolean!
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    available: Boolean!
    imageUrl: String
    ingredients: [String]
    allergens: [String]
    preparationTime: Int
    createdAt: String!
    updatedAt: String!
  }

  type Table {
    id: ID!
    number: Int!
    capacity: Int!
    status: String!
    location: String
    createdAt: String!
  }

  type OrderItem {
    menuItemId: ID!
    quantity: Int!
    specialInstructions: String
    price: Float!
    status: String!
  }

  type User {
    id: ID!
    name: String!
    mobileNumber: String!
    email: String
    sessionId: String
    createdAt: String!
    updatedAt: String!
  }

  type Order {
    id: ID!
    tableNumber: Int
    orderType: String!
    items: [OrderItem!]!
    status: String!
    totalAmount: Float!
    customerName: String
    customerPhone: String
    notes: String
    sessionId: String
    userId: String
    createdAt: String!
    updatedAt: String!
  }

  type Reservation {
    id: ID!
    customerName: String!
    customerPhone: String!
    customerEmail: String
    tableNumber: Int!
    date: String!
    time: String!
    partySize: Int!
    status: String!
    specialRequests: String
    createdAt: String!
  }

  type Query {
    health: Health!
    menuItems: [MenuItem!]!
    menuItem(id: ID!): MenuItem
    tables: [Table!]!
    table(id: ID!): Table
    orders: [Order!]!
    order(id: ID!): Order
    orderByTable(tableNumber: Int!): Order
    orderById(id: ID!): Order
    ordersBySession(sessionId: String!, orderType: String!): [Order!]!
    ordersByUser(userId: String!, orderType: String!): [Order!]!
    ordersByMobile(mobileNumber: String!, orderType: String!): [Order!]!
    userByMobile(mobileNumber: String!): User
    reservations: [Reservation!]!
    reservation(id: ID!): Reservation
  }

  type Mutation {
    createMenuItem(input: MenuItemInput!): MenuItem!
    updateMenuItem(id: ID!, input: MenuItemInput!): MenuItem!
    deleteMenuItem(id: ID!): Boolean!
    
    createTable(input: TableInput!): Table!
    updateTable(id: ID!, input: TableInput!): Table!
    deleteTable(id: ID!): Boolean!
    
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!
    
    createOrder(input: OrderInput!): Order!
    updateOrder(id: ID!, input: OrderInput!): Order!
    updateOrderItemStatus(orderId: ID!, itemIndex: Int!, status: String!): Order!
    deleteOrder(id: ID!): Boolean!
    
    createReservation(input: ReservationInput!): Reservation!
    updateReservation(id: ID!, input: ReservationInput!): Reservation!
    deleteReservation(id: ID!): Boolean!
  }

  input MenuItemInput {
    name: String!
    description: String
    price: Float!
    category: String!
    available: Boolean
    imageUrl: String
    ingredients: [String]
    allergens: [String]
    preparationTime: Int
  }

  input TableInput {
    number: Int!
    capacity: Int!
    status: String
    location: String
  }

  input OrderItemInput {
    menuItemId: ID!
    quantity: Int!
    specialInstructions: String
    price: Float!
    status: String
  }

  input UserInput {
    name: String!
    mobileNumber: String!
    email: String
    sessionId: String
  }

  input OrderInput {
    tableNumber: Int
    orderType: String!
    items: [OrderItemInput!]!
    status: String
    totalAmount: Float!
    customerName: String
    customerPhone: String
    notes: String
    sessionId: String
    userId: String
  }

  input ReservationInput {
    customerName: String!
    customerPhone: String!
    customerEmail: String
    tableNumber: Int!
    date: String!
    time: String!
    partySize: Int!
    status: String
    specialRequests: String
  }
`;
