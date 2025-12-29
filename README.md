# On-Demand Service Backend

A comprehensive NestJS backend application for managing on-demand service platforms. This backend provides APIs for connecting service providers with customers, handling bookings, payments, reviews, and real-time updates.

## 🚀 Features

### Authentication & Authorization
- **User Registration & Login** - Secure authentication with JWT tokens
- **OTP Verification** - Email and phone number verification
- **Password Reset** - Forgot password and reset functionality
- **Refresh Tokens** - Token refresh mechanism for enhanced security
- **Role-Based Access Control** - Three user roles: `USER`, `PROVIDER`, and `ADMIN`
- **Social Login Support** - Ready for Google, Facebook, and Apple authentication

### Service Management
- **Categories** - Organize services into categories with icons
- **Services** - Create and manage services with base pricing and duration
- **Service Providers** - Provider profiles with verification, ratings, and availability
- **Service Areas** - Geographic service areas with radius-based coverage
- **Weekly Schedules** - Provider availability scheduling

### Booking System
- **Create Bookings** - Users can book services from providers
- **Booking Status Tracking** - Track bookings through multiple statuses:
  - `PENDING` - Initial booking request
  - `ACCEPTED` - Provider accepted the booking
  - `ON_THE_WAY` - Provider is en route
  - `STARTED` - Service has started
  - `COMPLETED` - Service completed
  - `CANCELLED` - Booking cancelled
- **Booking Management** - View bookings for both users and providers

### Payment Processing
- **Payment Intents** - Create payment intents for bookings
- **Multiple Payment Methods** - Support for Card, Apple Pay, Google Pay, and Cash
- **Payment Status Tracking** - Track payment status (Pending, Processing, Succeeded, Failed, Cancelled, Refunded)
- **Webhook Support** - Handle payment webhooks from payment providers
- **Transaction Management** - Store transaction IDs and payment metadata

### Reviews & Ratings
- **Provider Reviews** - Users can leave reviews and ratings (1-5 stars)
- **Review Management** - View reviews for providers
- **Rating Aggregation** - Automatic calculation of provider ratings

### Real-Time Features
- **WebSocket Integration** - Real-time updates using Socket.io
- **Provider Location Tracking** - Track provider locations in real-time
- **Booking Updates** - Real-time booking status updates
- **Room-Based Communication** - Separate rooms for users, providers, and bookings

### Admin Dashboard
- **Provider Approval** - Approve or reject provider applications
- **Account Moderation** - Suspend or ban users and providers
- **Analytics** - Overview analytics, booking analytics, and revenue analytics
- **User Management** - Manage user accounts and status

## 🛠️ Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT (JSON Web Tokens)
- **Real-Time**: [Socket.io](https://socket.io/)
- **Validation**: Class Validator & Class Transformer
- **Language**: TypeScript
- **Testing**: Jest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or cloud instance)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/0thman3698/on-demand-backend.git
   cd on-demand-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/on-demand-service
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key
   JWT_EXPIRATION=1h
   JWT_REFRESH_EXPIRATION=7d
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system or configure the connection string for a cloud instance.

## 🚀 Running the Application

### Development Mode
```bash
npm run start:dev
```

The application will start on `http://localhost:3000` (or the port specified in your `.env` file).

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## 📝 API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Users (`/users`)
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile

### Providers (`/providers`)
- `POST /providers` - Create provider profile (PROVIDER role)
- `GET /providers/me` - Get current provider profile
- `PATCH /providers/me` - Update provider profile
- `PATCH /providers/me/availability` - Update availability status
- `GET /providers` - Get list of providers (with filters)

### Services (`/services`)
- `GET /services` - Get list of services
- `GET /services/:id` - Get service details
- `POST /services` - Create service (ADMIN)
- `PATCH /services/:id` - Update service (ADMIN)
- `DELETE /services/:id` - Delete service (ADMIN)

### Categories (`/categories`)
- `GET /categories` - Get list of categories
- `GET /categories/:id` - Get category details
- `POST /categories` - Create category (ADMIN)
- `PATCH /categories/:id` - Update category (ADMIN)
- `DELETE /categories/:id` - Delete category (ADMIN)

### Bookings (`/bookings`)
- `POST /bookings` - Create a new booking (USER)
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/status` - Update booking status (PROVIDER)
- `GET /bookings/user/me` - Get user's bookings
- `GET /bookings/provider/me` - Get provider's bookings

### Payments (`/payments`)
- `POST /payments/intent` - Create payment intent
- `POST /payments/webhook` - Handle payment webhook
- `GET /payments/:id` - Get payment details

### Reviews (`/reviews`)
- `POST /reviews` - Create a review (USER)
- `GET /reviews/provider/:providerId` - Get provider reviews
- `GET /reviews/me` - Get user's reviews

### Admin (`/admin`)
- `GET /admin/providers/pending` - Get pending provider applications
- `PATCH /admin/providers/:providerId/approve` - Approve provider
- `PATCH /admin/providers/:providerId/reject` - Reject provider
- `PATCH /admin/users/:userId/suspend` - Suspend user
- `PATCH /admin/users/:userId/ban` - Ban user
- `PATCH /admin/providers/:providerId/suspend` - Suspend provider
- `PATCH /admin/providers/:providerId/ban` - Ban provider
- `GET /admin/analytics/overview` - Get analytics overview
- `GET /admin/analytics/bookings` - Get booking analytics
- `GET /admin/analytics/revenue` - Get revenue analytics

## 🔌 WebSocket Events

### Client → Server
- `join.booking` - Join a booking room
- `leave.booking` - Leave a booking room
- `provider.location.update` - Update provider location (PROVIDER only)

### Server → Client
- `joined.booking` - Confirmation of joining booking room
- `left.booking` - Confirmation of leaving booking room
- `location.updated` - Confirmation of location update
- `booking.status.changed` - Booking status update
- `error` - Error messages

## 🧪 Testing

Run unit tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:cov
```

Run end-to-end tests:
```bash
npm run test:e2e
```

## 📦 Project Structure

```
src/
├── admin/              # Admin module (provider approval, analytics)
├── auth/               # Authentication module (JWT, OTP, password reset)
├── bookings/           # Booking management module
├── categories/         # Service categories module
├── payments/           # Payment processing module
├── providers/          # Service provider module
├── realtime/           # WebSocket real-time features
├── reviews/            # Reviews and ratings module
├── services/           # Services module
├── users/              # User management module
├── app.module.ts       # Root application module
└── main.ts             # Application entry point
```

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Passwords are hashed before storage
- **Role-Based Guards** - Route protection based on user roles
- **Input Validation** - Request validation using class-validator
- **CORS Enabled** - Configurable CORS for frontend integration
- **Webhook Signature Verification** - Secure payment webhook handling

## 📊 Database Models

- **User** - User accounts with roles and authentication
- **Provider** - Service provider profiles with verification
- **Service** - Available services with pricing
- **Category** - Service categories
- **Booking** - Service bookings with status tracking
- **Payment** - Payment transactions
- **Review** - Provider reviews and ratings

## 🚧 Environment Variables

Create a `.env` file with the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/on-demand-service

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Payment Provider (optional)
PAYMENT_PROVIDER_API_KEY=your-payment-provider-key
PAYMENT_WEBHOOK_SECRET=your-webhook-secret
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and unlicensed.

## 👤 Author

**0thman3698**

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Uses [Mongoose](https://mongoosejs.com/) for MongoDB integration
- Real-time features powered by [Socket.io](https://socket.io/)

