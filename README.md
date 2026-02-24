# SkillMart – Digital Services Marketplace

SkillMart is a production-ready student-focused digital services marketplace inspired by Fiverr. It supports buyers, sellers, and admins with complete service, order, review, and analytics workflows.

## Project Structure

```text
skillmart/
  backend/
    server.js
    package.json
    .env.example
    config/
      db.js
    models/
      User.js
      Service.js
      Order.js
      Review.js
    controllers/
      authController.js
      serviceController.js
      orderController.js
      reviewController.js
      adminController.js
    routes/
      authRoutes.js
      serviceRoutes.js
      orderRoutes.js
      reviewRoutes.js
      adminRoutes.js
    middleware/
      authMiddleware.js
      roleMiddleware.js
      validationMiddleware.js
      errorMiddleware.js
    utils/
      generateToken.js
  frontend/
    index.html
    login.html
    register.html
    dashboard.html
    service.html
    cart.html
    orders.html
    admin.html
    css/
      style.css
    js/
      app.js
  DOCUMENTATION.md
  README.md
```

## Features

- JWT-based authentication with register/login APIs
- Role-based access control for buyer/seller/admin
- Seller service creation, update, delete
- Public service listing and detail view
- localStorage-based cart and checkout (mock payment)
- Buyer and seller order management
- Review and rating system with average recalculation
- Admin panel for users, services, and analytics
- Security best practices (validation, rate limiting, helmet, CORS)

## Tech Stack

### Frontend
- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript (Fetch API)

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs
- dotenv

### Deployment Targets
- MongoDB Atlas
- Render (Backend)
- Vercel (Frontend)

## Local Installation

### 1. Clone and enter backend

```bash
cd skillmart/backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_long_secret>
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5500
```

### 3. Run backend

```bash
npm run dev
```

### 4. Run frontend

Open `skillmart/frontend/index.html` using VS Code Live Server or any static server.

## API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Services
- `POST /api/services` (seller/admin)
- `GET /api/services` (public)
- `GET /api/services/:id` (public)
- `PUT /api/services/:id` (owner/admin)
- `DELETE /api/services/:id` (owner/admin)
- `GET /api/services/my/list` (seller/admin)

### Orders
- `POST /api/orders/checkout`
- `GET /api/orders/buyer`
- `GET /api/orders/seller`
- `PUT /api/orders/:id/status`

### Reviews
- `POST /api/reviews`
- `GET /api/reviews/:serviceId`

### Admin
- `GET /api/admin/users`
- `DELETE /api/admin/user/:id`
- `GET /api/admin/services`
- `PUT /api/admin/service/:id/approve`
- `DELETE /api/admin/service/:id`
- `GET /api/admin/analytics`

## Security Best Practices Implemented

- Request validation via `express-validator`
- Password hashing using `bcryptjs`
- JWT with expiration
- Protected route middleware
- Role-based authorization middleware
- Error handling middleware
- CORS configuration
- Helmet security headers
- Basic rate limiting on `/api`
- Mongo query sanitization

## Deployment Guide

### 1. MongoDB Atlas Setup
1. Create a MongoDB Atlas account and cluster.
2. Create a database user and whitelist IPs (`0.0.0.0/0` for quick testing).
3. Copy the connection string and replace credentials.
4. Put this value into backend `MONGO_URI` environment variable.

### 2. Deploy Backend on Render
1. Push `skillmart/backend` to GitHub.
2. In Render, create a **Web Service**.
3. Connect repository and select backend root.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=10000` (Render default)
   - `MONGO_URI=<atlas-uri>`
   - `JWT_SECRET=<secret>`
   - `JWT_EXPIRES_IN=7d`
   - `FRONTEND_URL=<vercel-frontend-url>`
7. Deploy and test `GET /api/health`.

### 3. Frontend Environment Setup
Update API base in `frontend/js/app.js`:

```js
const API_BASE = localStorage.getItem('skillmart_api_base') || 'https://your-render-api.onrender.com/api';
```

### 4. Deploy Frontend on Vercel
1. Push `skillmart/frontend` to GitHub.
2. Create a Vercel project from that repo/folder.
3. Keep framework preset as **Other** (static site).
4. Deploy.

### 5. Connect Frontend to Backend
- Ensure Render `FRONTEND_URL` matches Vercel domain.
- Confirm frontend `API_BASE` points to Render backend URL.
- Test login, service listing, checkout, and admin routes.

## Screenshots (Placeholders)

- Home Page: `docs/screenshots/home.png`
- Seller Dashboard: `docs/screenshots/seller-dashboard.png`
- Cart & Checkout: `docs/screenshots/cart.png`
- Admin Dashboard: `docs/screenshots/admin-dashboard.png`

## License

MIT

## Platform Upgrade (New Modules)

This project now includes the following production modules:

- Category system with service `categoryId` reference
- Subscription plans (`Free`, `Pro`, `Premium`) and subscription middleware checks
- Withdrawal request workflow (seller request + admin approve/reject)
- Coupon/Promo code management and checkout coupon application
- Portfolio showcase for sellers

### New Endpoints

- Categories:
  - `POST /api/categories` (admin)
  - `GET /api/categories`
  - `PUT /api/categories/:id` (admin)
  - `DELETE /api/categories/:id` (admin)

- Subscriptions:
  - `POST /api/subscriptions/upgrade`
  - `GET /api/subscriptions/my`

- Withdrawals:
  - `POST /api/withdrawals/request`
  - `GET /api/withdrawals/my`
  - `PUT /api/admin/withdrawals/:id` (admin)

- Coupons:
  - `POST /api/coupons` (admin)
  - `GET /api/coupons`
  - `POST /api/coupons/apply`
  - `POST /api/orders/apply-coupon`

- Portfolio:
  - `POST /api/portfolio`
  - `GET /api/portfolio/:sellerId`
  - `PUT /api/portfolio/:id`
  - `DELETE /api/portfolio/:id`

---

## 👨‍💻 Author

**Pranjal Bodke**  
Full Stack Developer  

- 🎓 B.E. Computer Science Engineering  
- 💡 Passionate about Backend Systems & Scalable Architecture  
- 🚀 Built SkillMart – Full Stack Marketplace with Escrow & Invoice System  

📫 Connect with me:  
- LinkedIn: https://www.linkedin.com/in/pranjali-bodke-404111282/
- GitHub: https://github.com/rprp14
