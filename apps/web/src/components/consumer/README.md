# Consumer Page Components

This directory contains the components for the consumer-facing interface that customers access via QR code.

## Components

### ConsumerPage.tsx
Main consumer page component that handles routing and tab management.

**Features:**
- Table number validation from URL parameter
- Responsive tab navigation (Menu, Order, Invoice)
- Error handling for invalid table numbers

**URL Structure:**
- `/consumer/:tableNumber` - Access consumer interface for specific table

### ConsumerLayout.tsx
Responsive layout component specifically designed for consumer interface.

**Features:**
- Mobile-optimized header with table number display
- No navigation drawer (cleaner for customers)
- Responsive footer
- Sticky app bar for easy access

### MenuTab.tsx
Menu browsing and cart management interface.

**Features:**
- Search and filter menu items by category
- Add/remove items from cart
- Real-time cart summary
- Responsive grid layout for menu items
- Integration with GraphQL backend

### OrderTab.tsx
Order management and status tracking.

**Features:**
- View current order details
- Modify item quantities
- Add special notes to items
- Order status tracking
- Send order functionality

### InvoiceTab.tsx
Payment processing and invoice management.

**Features:**
- View detailed invoice breakdown
- Multiple payment methods (Card, Mobile)
- Tip calculation (percentage or custom amount)
- Payment status tracking
- Receipt generation

## Responsive Design

All components are fully responsive and optimized for mobile devices:

- **Mobile (< 600px)**: Single column layout, larger touch targets
- **Tablet (600px - 900px)**: Two column layout for better space utilization
- **Desktop (> 900px)**: Multi-column layout with optimal spacing

## Usage

1. Generate QR codes for each table using the QRCodeGenerator component
2. Customers scan QR code to access `/consumer/{tableNumber}`
3. Customers can browse menu, place orders, and pay through the interface
4. All data is synchronized with the backend via GraphQL

## Testing

Test the consumer interface by visiting:
- http://localhost:5173/consumer/1
- http://localhost:5173/consumer/5
- http://localhost:5173/consumer/10

Or use the QR code generator on the main dashboard.
