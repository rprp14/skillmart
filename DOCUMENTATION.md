🚀 SkillMart – Full Stack Student Services Marketplace
1️⃣ Problem Statement

In today’s academic ecosystem, students frequently require digital services such as:

Resume building

Logo design

Web development

Assignment assistance

Coding support

Content writing

Existing freelance platforms (like Fiverr and Upwork) are broad, competitive, and not optimized for:

Student pricing models

Lightweight onboarding

Campus-level trust systems

Academic service categories

There is a need for a secure, simplified, student-oriented marketplace that enables:

Affordable service exchange

Transparent workflow

Role-based control

Secure transactions

Dispute resolution

Wallet and invoice tracking

SkillMart solves this problem by providing a structured and secure digital service marketplace designed for students and early freelancers.

2️⃣ Objectives

The core objectives of SkillMart are:

🎯 Functional Objectives

Implement a full order lifecycle system

Enable secure buyer–seller transactions

Allow sellers to monetize skills

Enable buyers to safely purchase services

Provide invoice generation and wallet tracking

🔐 Security Objectives

JWT-based authentication

Role-based access control (RBAC)

Password hashing

Protected API routes

Secure data validation

📊 Administrative Objectives

Monitor platform activity

Approve/reject services

Track revenue & commissions

Handle disputes

Manage withdrawals

3️⃣ System Architecture Overview

SkillMart follows a three-layer architecture:

🖥️ Presentation Layer (Frontend)

HTML5

Bootstrap 5

Vanilla JavaScript

Fetch API

Handles:

UI rendering

Form submission

Role-based interface switching

Client-side cart system

⚙️ Application Layer (Backend)

Node.js

Express.js

REST API

Middleware architecture

Handles:

Business logic

Authentication

Order processing

Invoice generation

Wallet calculations

Dispute resolution

🗄️ Data Layer (Database)

PostgreSQL (Sequelize ORM)

Handles:

User records

Services

Orders

Invoice records

Wallet transactions

Subscriptions

Coupons

Disputes

4️⃣ System Modules (Detailed)
🔐 Authentication Module

Features:

User registration

User login

JWT token issuance

Protected routes

Password hashing (bcrypt)

Role-based middleware

Security:

Token-based authentication

Middleware for route protection

Role validation (buyer/seller/admin)

👥 User & Role Module

Three primary roles:

🛍️ Buyer

Browse services

Add to cart

Checkout

Track orders

Download invoice

Raise disputes

🧑‍💻 Seller

Create services

Manage services

Accept orders

Complete orders

Send invoice

Withdraw earnings

👨‍💼 Admin

Approve services

Delete services

Manage users

Review disputes

Process withdrawals

Monitor analytics

🛍️ Service Module

Seller capabilities:

Create service

Add price

Add package tiers

Add tags

Select category

Admin capabilities:

Approve service

Delete service

Buyer capabilities:

Browse services

View details

See ratings

🛒 Cart & Checkout Module

Cart System:

Uses localStorage

Allows add/remove service

Shows total price

Supports coupon discount

Checkout:

Mock payment simulation

Creates order record

Escrow mechanism

Commission calculation

📦 Order Module

Order Lifecycle:

Buyer places order

Order status = Pending

Seller marks as Accepted

Seller marks as Completed

Seller sends invoice

Payment released to seller wallet

Order statuses:

Pending

Accepted

Completed

🧾 Invoice Module

Features:

Automatic invoice number generation

Invoice PDF creation (PDFKit)

Tax calculation

Commission breakdown

Invoice record storage

Download invoice

Seller sends invoice to buyer

Invoice includes:

Buyer details

Seller details

Service description

Subtotal

Tax

Commission

Total payable

💰 Wallet Module

Seller wallet system:

Tracks earnings

Tracks commission deduction

Logs credit/debit transactions

Supports withdrawal requests

Withdrawal flow:

Seller submits request

Admin approves/rejects

Wallet updated accordingly

🎫 Coupon Module

Admin can:

Create coupons

Set percentage or fixed discount

Set expiry date

Set max usage

Buyer:

Applies coupon at checkout

Receives discounted total

⚖️ Dispute Module

Buyer can:

Raise dispute on order

Admin can:

Review dispute

Refund buyer

Release seller

Reject dispute

Dispute states:

Open

UnderReview

Resolved

Rejected

📊 Admin Analytics Module

Admin Dashboard includes:

Total users

Total sellers

Total services

Total orders

Total revenue

Total commission

Open disputes

Top category

5️⃣ Database Entities

Core entities:

Users

Services

Orders

InvoiceRecords

WalletTransactions

WithdrawalRequests

Categories

Coupons

Disputes

Subscriptions

Portfolio

Each entity is normalized and linked via foreign keys.

6️⃣ Security Features

JWT authentication

bcrypt password hashing

Input validation middleware

CORS protection

Helmet security headers

Rate limiting

Role-based route guards

Protected API endpoints

7️⃣ System Workflow (End-to-End)
Buyer Journey

Browse → Add to Cart → Checkout → Track Order → Download Invoice

Seller Journey

Create Service → Accept Order → Complete Order → Send Invoice → Withdraw Earnings

Admin Journey

Approve Service → Monitor Orders → Handle Disputes → Manage Withdrawals → View Analytics

8️⃣ Future Enhancements

Stripe / Razorpay integration

Real escrow payment gateway

Live chat system

File upload for delivery

Email notification system

WebSocket real-time updates

AI-based service recommendation

Seller verification badge

Deployment to AWS/Render

9️⃣ Resume Description (Improved Version)

Developed SkillMart, a full-stack digital services marketplace using Node.js, Express, PostgreSQL, and Bootstrap. Implemented JWT authentication, role-based access control, escrow-based order lifecycle, invoice PDF generation, wallet and withdrawal system, dispute resolution workflow, coupon engine, subscription plans, and admin analytics dashboard with secure middleware architecture and modular REST API design.

🔟 Key Highlights

Complete real-world marketplace simulation

Escrow system logic

Automated invoice generation

Wallet ledger tracking

Multi-role system

Admin financial control

Scalable architecture

Deployment-ready backend
