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
    salaryConfig: SalaryConfig
    createdAt: String!
    updatedAt: String!
  }

  type StaffAuthPayload {
    token: String!
    staff: Staff!
    restaurant: Restaurant!
  }

  type PasswordResetResponse {
    success: Boolean!
    message: String!
    token: String
  }

  type PlatformAnalytics {
    totalRestaurants: Int!
    activeRestaurants: Int!
    totalOrders: Int!
    totalRevenue: Float!
  }

  type MenuCategory {
    id: ID!
    restaurantId: ID!
    name: String!
    parentCategoryId: ID
    parentCategory: MenuCategory
    sortOrder: Int!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    categoryId: ID
    categoryObj: MenuCategory
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
    paymentMethod: String
    paymentTransactionId: String
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
    menuCategories: [MenuCategory!]!
    menuCategory(id: ID!): MenuCategory
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
    
    # Salary Management queries
    staffSalaryConfig(staffId: ID!): SalaryConfig
    staffSalaryPayments(staffId: ID!, limit: Int, offset: Int): SalaryPaymentConnection!
    staffSalarySummary(staffId: ID!): SalarySummary
    allStaffSalaryPayments(restaurantId: ID!, limit: Int, offset: Int, paymentStatus: String): SalaryPaymentConnection!
    staffAdvancePayments(staffId: ID!, limit: Int, offset: Int, isSettled: Boolean): AdvancePaymentConnection!
    staffAdvanceSummary(staffId: ID!): AdvanceSummary
    
    # Purchase Management queries
    purchaseCategories(restaurantId: ID!): [PurchaseCategory!]!
    purchaseCategory(id: ID!): PurchaseCategory
    vendors(restaurantId: ID!): [Vendor!]!
    vendor(id: ID!): Vendor
    purchases(restaurantId: ID!, limit: Int, offset: Int, vendorId: ID, categoryId: ID, paymentStatus: String, startDate: String, endDate: String): PurchaseConnection!
    purchase(id: ID!): Purchase
  }

  type Mutation {
    # Restaurant Authentication
    registerRestaurant(input: RestaurantInput!): AuthPayload!
    loginRestaurant(email: String!, password: String!): AuthPayload!
    resetRestaurantPassword(email: String!): PasswordResetResponse!
    updateRestaurantPassword(token: String!, newPassword: String!): PasswordResetResponse!
    
    # Admin Authentication
    loginAdmin(email: String!, password: String!): AdminAuthPayload!
    resetAdminPassword(email: String!): PasswordResetResponse!
    updateAdminPassword(token: String!, newPassword: String!): PasswordResetResponse!
    
    # Staff Authentication
    loginStaff(email: String!, password: String!): StaffAuthPayload!
    resetStaffPassword(email: String!): PasswordResetResponse!
    updateStaffPassword(token: String!, newPassword: String!): PasswordResetResponse!
    
    # Admin Management
    createRestaurant(input: RestaurantInput!): Restaurant!
    updateRestaurant(id: ID!, input: UpdateRestaurantInput!): Restaurant!
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
    
    createMenuItem(input: MenuItemInput!): MenuItem!
    updateMenuItem(id: ID!, input: MenuItemInput!): MenuItem!
    deleteMenuItem(id: ID!): Boolean!
    createMenuCategory(input: MenuCategoryInput!): MenuCategory!
    updateMenuCategory(id: ID!, input: UpdateMenuCategoryInput!): MenuCategory!
    deleteMenuCategory(id: ID!): Boolean!
    
    createTable(input: TableInput!): Table!
    updateTable(id: ID!, input: TableInput!): Table!
    deleteTable(id: ID!): Boolean!
    
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!
    
    createOrder(input: OrderInput!): Order!
    updateOrder(id: ID!, input: OrderInput!): Order!
    deleteOrder(id: ID!): Boolean!
    
    createReservation(input: ReservationInput!): Reservation!
    updateReservation(id: ID!, input: ReservationInput!): Reservation!
    deleteReservation(id: ID!): Boolean!
    markOrderPaid(id: ID!, paymentMethod: String!, paymentTransactionId: String): Order!
    setRestaurantFeeConfig(restaurantId: ID!, mode: String!, amount: Float!, freeOrdersRemaining: Int): RestaurantFeeConfig!
    generateWeeklySettlement(restaurantId: ID!, periodStart: String!, periodEnd: String!): Settlement!
    updateFeePaymentStatus(feeLedgerId: ID!, paymentStatus: String!, paymentMethod: String, paymentTransactionId: String, reason: String): FeeLedger!
    payPlatformFees(restaurantId: ID!, paymentMethod: String!, paymentTransactionId: String): PaymentResult!
    
    # Salary Management mutations
    setStaffSalaryConfig(input: SalaryConfigInput!): SalaryConfig!
    updateStaffSalaryConfig(id: ID!, input: UpdateSalaryConfigInput!): SalaryConfig!
    createSalaryPayment(input: SalaryPaymentInput!): SalaryPayment!
    updateSalaryPayment(id: ID!, input: UpdateSalaryPaymentInput!): SalaryPayment!
    deleteSalaryPayment(id: ID!): Boolean!
    createAdvancePayment(input: AdvancePaymentInput!): AdvancePayment!
    updateAdvancePayment(id: ID!, input: UpdateAdvancePaymentInput!): AdvancePayment!
    deleteAdvancePayment(id: ID!): Boolean!
    
    # Purchase Management mutations
    createPurchaseCategory(input: PurchaseCategoryInput!): PurchaseCategory!
    updatePurchaseCategory(id: ID!, input: UpdatePurchaseCategoryInput!): PurchaseCategory!
    deletePurchaseCategory(id: ID!): Boolean!
    createVendor(input: VendorInput!): Vendor!
    updateVendor(id: ID!, input: UpdateVendorInput!): Vendor!
    deleteVendor(id: ID!): Boolean!
    createPurchase(input: PurchaseInput!): Purchase!
    updatePurchase(id: ID!, input: UpdatePurchaseInput!): Purchase!
    settlePurchases(input: PurchaseSettlementInput!): BulkPurchaseSettlementResult!
    deletePurchase(id: ID!): Boolean!
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

  type SalaryConfig {
    id: ID!
    staffId: ID!
    restaurantId: ID!
    salaryType: String!
    baseSalary: Float
    hourlyRate: Float
    currency: String!
    paymentFrequency: String!
    effectiveDate: String!
    notes: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type SalaryPayment {
    id: ID!
    staffId: ID!
    restaurantId: ID!
    paymentPeriodStart: String!
    paymentPeriodEnd: String!
    baseAmount: Float!
    hoursWorked: Float
    hourlyRate: Float
    bonusAmount: Float!
    deductionAmount: Float!
    advanceDeduction: Float!
    totalAmount: Float!
    paymentStatus: String!
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    notes: String
    createdBy: String!
    createdById: String!
    createdAt: String!
    updatedAt: String!
  }

  type AdvancePayment {
    id: ID!
    staffId: ID!
    restaurantId: ID!
    amount: Float!
    advanceDate: String!
    paymentStatus: String!
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    notes: String
    isSettled: Boolean!
    settledAt: String
    settledByPaymentId: String
    originalAdvanceId: ID
    createdBy: String!
    createdById: String!
    createdAt: String!
    updatedAt: String!
  }

  type AdvancePaymentConnection {
    data: [AdvancePayment!]!
    totalCount: Int!
  }

  type AdvanceSummary {
    staffId: ID!
    totalAdvance: Float!
    totalSettled: Float!
    pendingSettlement: Float!
    unsettledCount: Int!
    currency: String!
  }

  type SalaryPaymentConnection {
    data: [SalaryPayment!]!
    totalCount: Int!
  }

  type SalarySummary {
    staffId: ID!
    staffName: String!
    totalPaid: Float!
    totalPending: Float!
    totalFailed: Float!
    paymentCount: Int!
    lastPaymentDate: String
    currency: String!
  }

  type PurchaseCategory {
    id: ID!
    restaurantId: ID!
    name: String!
    description: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Vendor {
    id: ID!
    restaurantId: ID!
    name: String!
    contactPerson: String
    phone: String
    email: String
    address: String
    notes: String
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type PurchaseItem {
    id: ID!
    purchaseId: ID!
    itemName: String!
    quantity: Float!
    unit: String!
    unitPrice: Float!
    totalPrice: Float!
    categoryId: ID
    category: PurchaseCategory
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type Purchase {
    id: ID!
    restaurantId: ID!
    vendorId: ID!
    vendor: Vendor
    purchaseDate: String!
    items: [PurchaseItem!]!
    totalAmount: Float!
    currency: String!
    paymentStatus: String!
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    invoiceNumber: String
    notes: String
    createdBy: String!
    createdById: String!
    createdAt: String!
    updatedAt: String!
  }

  type PurchaseConnection {
    data: [Purchase!]!
    totalCount: Int!
    totalAmountSum: Float!
    unpaidAmountSum: Float!
    unpaidCount: Int!
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

  # Separate input for updates where password should be optional
  input UpdateRestaurantInput {
    name: String!
    email: String!
    password: String
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

  input MenuCategoryInput {
    restaurantId: ID
    name: String!
    parentCategoryId: ID
    sortOrder: Int
    isActive: Boolean
  }

  input UpdateMenuCategoryInput {
    name: String
    parentCategoryId: ID
    sortOrder: Int
    isActive: Boolean
  }

  input MenuItemInput {
    restaurantId: ID!
    name: String!
    description: String
    price: Float!
    category: String
    categoryId: ID
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

  input SalaryConfigInput {
    staffId: ID!
    restaurantId: ID!
    salaryType: String!
    baseSalary: Float
    hourlyRate: Float
    currency: String!
    paymentFrequency: String!
    effectiveDate: String!
    notes: String
  }

  input UpdateSalaryConfigInput {
    salaryType: String
    baseSalary: Float
    hourlyRate: Float
    currency: String
    paymentFrequency: String
    effectiveDate: String
    notes: String
    isActive: Boolean
  }

  input SalaryPaymentInput {
    staffId: ID!
    restaurantId: ID!
    paymentPeriodStart: String!
    paymentPeriodEnd: String!
    baseAmount: Float!
    hoursWorked: Float
    hourlyRate: Float
    bonusAmount: Float
    deductionAmount: Float
    advanceDeduction: Float
    totalAmount: Float!
    paymentStatus: String
    paymentMethod: String
    paymentTransactionId: String
    notes: String
  }

  input UpdateSalaryPaymentInput {
    paymentPeriodStart: String
    paymentPeriodEnd: String
    baseAmount: Float
    hoursWorked: Float
    hourlyRate: Float
    bonusAmount: Float
    deductionAmount: Float
    advanceDeduction: Float
    totalAmount: Float
    paymentStatus: String
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    notes: String
  }

  input AdvancePaymentInput {
    staffId: ID!
    restaurantId: ID!
    amount: Float!
    advanceDate: String!
    paymentStatus: String
    paymentMethod: String
    paymentTransactionId: String
    notes: String
  }

  input UpdateAdvancePaymentInput {
    amount: Float
    advanceDate: String
    paymentStatus: String
    paymentMethod: String
    paymentTransactionId: String
    paidAt: String
    notes: String
  }

  input PurchaseCategoryInput {
    restaurantId: ID!
    name: String!
    description: String
    isActive: Boolean
  }

  input UpdatePurchaseCategoryInput {
    name: String
    description: String
    isActive: Boolean
  }

  input VendorInput {
    restaurantId: ID!
    name: String!
    contactPerson: String
    phone: String
    email: String
    address: String
    notes: String
    isActive: Boolean
  }

  input UpdateVendorInput {
    name: String
    contactPerson: String
    phone: String
    email: String
    address: String
    notes: String
    isActive: Boolean
  }

  input PurchaseItemInput {
    itemName: String!
    quantity: Float!
    unit: String!
    unitPrice: Float!
    categoryId: ID
    notes: String
  }

  input PurchaseInput {
    restaurantId: ID!
    vendorId: ID!
    purchaseDate: String!
    items: [PurchaseItemInput!]!
    totalAmount: Float!
    currency: String
    paymentStatus: String
    paymentMethod: String
    invoiceNumber: String
    notes: String
  }

  input UpdatePurchaseInput {
    vendorId: ID
    purchaseDate: String
    items: [PurchaseItemInput!]
    totalAmount: Float
    currency: String
    paymentStatus: String
    paymentMethod: String
    invoiceNumber: String
    notes: String
  }

  input PurchaseSettlementInput {
    restaurantId: ID!
    purchaseIds: [ID!]
    vendorId: ID
    categoryId: ID
    startDate: String
    endDate: String
    paymentMethod: String!
    paymentTransactionId: String
    paidAt: String
  }

  type SampleDataResponse {
    success: Boolean!
    message: String!
  }

  type BulkPurchaseSettlementResult {
    matchedCount: Int!
    modifiedCount: Int!
  }

  type MenuItemsUpdate {
    restaurantId: ID!
    updatedAt: String!
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
    menuItemsUpdated(restaurantId: ID!): MenuItemsUpdate!
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
