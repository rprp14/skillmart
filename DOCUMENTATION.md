# SkillMart Documentation

## 1. Problem Statement
Students and freelancers often need a trusted platform to sell and buy digital services such as logo design, coding help, assignment support, and content writing. Existing marketplaces are broad and not tailored to student needs, pricing behavior, or lightweight onboarding.

## 2. Objectives
- Build a secure marketplace for student-focused digital services.
- Provide role-based workflows for buyers, sellers, and admin.
- Enable full order lifecycle from browsing to checkout to completion.
- Maintain service quality through admin approval and review-driven ratings.
- Offer a simple frontend with responsive pages and API-driven interaction.

## 3. System Modules
- Authentication Module: Registration, login, JWT issuance, protected routes.
- User & Role Module: Buyer, seller, and admin role enforcement.
- Service Module: Seller CRUD, public listing, admin approval/moderation.
- Cart & Checkout Module: localStorage cart and backend mock payment checkout.
- Order Module: Buyer/seller order views and status transitions.
- Review Module: Review submission with auto-updated average ratings.
- Admin Module: User management, service moderation, analytics.

## 4. Tech Stack Explanation
- Node.js + Express.js: Lightweight, scalable REST API server.
- MongoDB + Mongoose: Flexible schema design for marketplace entities.
- JWT: Stateless authentication and secure API session handling.
- bcryptjs: Safe password hashing with salt rounds.
- Bootstrap 5 + Vanilla JS: Fast, responsive UI with minimal complexity.
- dotenv: Environment-based config for secure deployment.

## 5. Features List
- User register/login/logout flows.
- Role-based authorization (buyer/seller/admin).
- Seller service creation and management.
- Public browsing and detailed service pages.
- Cart management via localStorage.
- Checkout with mock payment and seller wallet updates.
- Order tracking and seller status updates.
- Review system with rating aggregation.
- Admin analytics and moderation tools.
- Security middleware: Helmet, CORS, input validation, rate limiting.

## 6. Future Enhancements
- Real payment integration (Stripe/Razorpay/PayPal).
- Chat system between buyer and seller.
- File attachments for order delivery.
- Notification center (email + in-app).
- Advanced search/filter/sort and recommendation engine.
- Seller verification and dispute resolution flows.

## 7. Resume Description
Developed **SkillMart**, a full-stack digital services marketplace for students using Node.js, Express, MongoDB, and Bootstrap. Implemented JWT authentication, role-based access control, service CRUD, cart/checkout, order lifecycle, review aggregation, and admin analytics dashboard with production-grade security middleware and deployment-ready architecture.
