export const typeDefs = `#graphql
  type Health {
    ok: Boolean!
    mongo: Boolean!
  }

  type Restaurant {
    id: ID!
    name: String!
    slug: String!
    email: String!
    address: String
    phone: String
    settings: RestaurantSettings!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type RestaurantSettings {
    currency: String!
    timezone: String!
    theme: String
  }

  type AuthPayload {
    token: String!
    restaurant: Restaurant!
  }

  type Admin {
    id: ID!
    name: String!
    email: String!
    role: String!
    permissions: [String!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type AdminAuthPayload {
    token: String!
    admin: Admin!
  }

  type Staff {
    id: ID!
    name: String!
    email: String!
    role: String!
    permissions: [String!]!
    restaurantId: ID!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type StaffAuthPayload {
    token: String!
    staff: Staff!
    restaurant: Restaurant!
  }

  type PlatformAnalytics {
    totalRestaurants: Int!
    activeRestaurants: Int!
    totalOrders: Int!
    totalRevenue: Float!
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
    restaurantId: ID!
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
    paid: Boolean
    paidAt: String
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
    restaurantBySlug(slug: String!): Restaurant
    menuItems: [MenuItem!]!
    menuItem(id: ID!): MenuItem
    tables: [Table!]!
    table(id: ID!): Table
    availableTables: [Table!]!
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
    
    # Admin queries
    allRestaurants: [Restaurant!]!
    restaurantById(id: ID!): Restaurant
    platformAnalytics: PlatformAnalytics!
    allOrders(limit: Int, offset: Int): [Order!]!
    
    # Staff queries
    staffByRestaurant(restaurantId: ID!): [Staff!]!
    staffById(id: ID!): Staff
    ordersForStaff(restaurantId: ID!): [Order!]!
    orderByIdForStaff(id: ID!): Order
    feeLedgers(restaurantId: ID!, limit: Int, offset: Int): FeeLedgerConnection!
    restaurantFeeConfig(restaurantId: ID!): RestaurantFeeConfig
    settlements(restaurantId: ID!, limit: Int, offset: Int): [Settlement!]!
    dueFeesSummary: [DueFeesSummary!]!
  }

  type Mutation {
    # Restaurant Authentication
    registerRestaurant(input: RestaurantInput!): AuthPayload!
    loginRestaurant(email: String!, password: String!): AuthPayload!
    
    # Admin Authentication
    loginAdmin(email: String!, password: String!): AdminAuthPayload!
    
    # Staff Authentication
    loginStaff(email: String!, password: String!): StaffAuthPayload!
    
    # Admin Management
    createRestaurant(input: RestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: RestaurantInput!): Restaurant!
    deleteRestaurant(id: ID!): Boolean!
    deactivateRestaurant(id: ID!): Restaurant!
    createAdmin(input: AdminInput!): Admin!
    createSampleDataForRestaurant(restaurantId: ID!): SampleDataResponse!
    
    # Staff Management
    createStaff(input: StaffInput!): Staff!
    updateStaff(id: ID!, input: UpdateStaffInput!): Staff!
    deactivateStaff(id: ID!): Staff!
    activateStaff(id: ID!): Staff!
    
    # Staff Order Management
    updateOrderStatusForStaff(id: ID!, status: String!): Order!
    updateOrderItemStatusForStaff(orderId: ID!, itemIndex: Int!, status: String!): Order!
    
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
    markOrderPaid(id: ID!): Order!
    setRestaurantFeeConfig(restaurantId: ID!, mode: String!, amount: Float!, freeOrdersRemaining: Int): RestaurantFeeConfig!
    generateWeeklySettlement(restaurantId: ID!, periodStart: String!, periodEnd: String!): Settlement!
    updateFeePaymentStatus(feeLedgerId: ID!, paymentStatus: String!, paymentMethod: String, paymentTransactionId: String, reason: String): FeeLedger!
    payPlatformFees(restaurantId: ID!, paymentMethod: String!, paymentTransactionId: String): PaymentResult!
  }
  type RestaurantFeeConfig {
    restaurantId: ID!
    mode: String!
    amount: Float!
    freeOrdersRemaining: Int!
    updatedAt: String!
  }

  type FeeLedger {
    id: ID!
    restaurantId: ID!
    orderId: ID!
    orderTotal: Float!
    feeMode: String!
    feeRate: Float!
    feeAmount: Float!
    currency: String!
    discountApplied: Boolean!
    paymentStatus: String!
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    createdAt: String!
  }

  type FeeLedgerConnection {
    data: [FeeLedger!]!
    totalCount: Int!
  }

  type Settlement {
    id: ID!
    restaurantId: ID!
    currency: String!
    periodStart: String!
    periodEnd: String!
    totalOrders: Int!
    totalOrderAmount: Float!
    totalFees: Float!
    generatedAt: String!
  }

  type DueFeesSummary {
    restaurantId: ID!
    restaurantName: String!
    totalDueFees: Float!
    pendingCount: Int!
    currency: String!
    lastPaymentDate: String
    oldestDueDate: String
  }

  type DueFeesUpdate {
    restaurantId: ID!
    totalDueFees: Float!
    pendingCount: Int!
    updatedAt: String!
  }

  type PaymentResult {
    success: Boolean!
    message: String!
    paidFeesCount: Int!
    totalAmountPaid: Float!
    transactionId: String!
  }

  input AdminInput {
    name: String!
    email: String!
    password: String!
    role: String
    permissions: [String!]
  }

  input StaffInput {
    name: String!
    email: String!
    password: String!
    restaurantId: ID!
    role: String
    permissions: [String!]
  }

  input UpdateStaffInput {
    name: String
    email: String
    password: String
    role: String
    permissions: [String!]
  }

  input RestaurantInput {
    name: String!
    email: String!
    password: String!
    address: String
    phone: String
    slug: String
    isActive: Boolean
    settings: RestaurantSettingsInput
  }

  input RestaurantSettingsInput {
    currency: String
    timezone: String
    theme: String
  }

  input MenuItemInput {
    restaurantId: ID!
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
    restaurantId: ID!
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
    restaurantId: ID!
    name: String!
    mobileNumber: String!
    email: String
    sessionId: String
  }

  input OrderInput {
    restaurantId: ID!
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
    restaurantId: ID!
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

  type SampleDataResponse {
    success: Boolean!
    message: String!
  }

  type Subscription {
    orderUpdated(restaurantId: ID!): Order!
    orderItemStatusUpdated(restaurantId: ID!): Order!
    newOrder(restaurantId: ID!): Order!
    auditLogCreated: AuditLog!
    restaurantUpdated: Restaurant!
    staffUpdated(restaurantId: ID!): Staff!
    platformAnalyticsUpdated: PlatformAnalytics!
    feeLedgerUpdated: FeeLedger!
    paymentStatusUpdated: FeeLedger!
    dueFeesUpdated(restaurantId: ID!): DueFeesUpdate!
  }

  type AuditLog {
    id: ID!
    actorRole: String!
    actorId: ID
    action: String!
    entityType: String!
    entityId: ID!
    reason: String
    details: JSON
    restaurantId: ID
    ip: String
    userAgent: String
    createdAt: String!
  }

  scalar JSON

  input CreateAuditLogInput {
    actorRole: String!
    actorId: ID
    action: String!
    entityType: String!
    entityId: ID!
    reason: String
    details: JSON
    restaurantId: ID
  }

  extend type Query {
    auditLogs(limit: Int, offset: Int, action: String, entityType: String, restaurantId: ID): [AuditLog!]!
  }

  extend type Mutation {
    createAuditLog(input: CreateAuditLogInput!): AuditLog!
  }
`;
