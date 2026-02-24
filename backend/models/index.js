const User = require('./User');
const Service = require('./Service');
const Order = require('./Order');
const Review = require('./Review');
const Favorite = require('./Favorite');
const Notification = require('./Notification');
const InvoiceRecord = require('./InvoiceRecord');
const WalletTransaction = require('./WalletTransaction');
const Dispute = require('./Dispute');
const Milestone = require('./Milestone');
const Category = require('./Category');
const Subscription = require('./Subscription');
const WithdrawalRequest = require('./WithdrawalRequest');
const Coupon = require('./Coupon');
const Portfolio = require('./Portfolio');

User.hasMany(Service, { foreignKey: 'sellerId', as: 'services' });
Service.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

User.hasMany(Order, { foreignKey: 'buyerId', as: 'buyerOrders' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

User.hasMany(Order, { foreignKey: 'sellerId', as: 'sellerOrders' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

Service.hasMany(Order, { foreignKey: 'serviceId', as: 'orders' });
Order.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Service.hasMany(Review, { foreignKey: 'serviceId', as: 'reviews' });
Review.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Service.hasMany(Favorite, { foreignKey: 'serviceId', as: 'favoriteEntries' });
Favorite.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasOne(InvoiceRecord, { foreignKey: 'orderId', as: 'invoice' });
InvoiceRecord.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(WalletTransaction, { foreignKey: 'userId', as: 'walletTransactions' });
WalletTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Order.hasMany(WalletTransaction, { foreignKey: 'relatedOrderId', as: 'walletTransactions' });
WalletTransaction.belongsTo(Order, { foreignKey: 'relatedOrderId', as: 'relatedOrder' });

Order.hasMany(Dispute, { foreignKey: 'orderId', as: 'disputes' });
Dispute.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
User.hasMany(Dispute, { foreignKey: 'raisedById', as: 'raisedDisputes' });
Dispute.belongsTo(User, { foreignKey: 'raisedById', as: 'raisedBy' });

Order.hasMany(Milestone, { foreignKey: 'orderId', as: 'milestones' });
Milestone.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Category.hasMany(Service, { foreignKey: 'categoryId', as: 'services' });
Service.belongsTo(Category, { foreignKey: 'categoryId', as: 'categoryRef' });

User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(WithdrawalRequest, { foreignKey: 'sellerId', as: 'withdrawalRequests' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

User.hasMany(Portfolio, { foreignKey: 'sellerId', as: 'portfolioItems' });
Portfolio.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

module.exports = {
  User,
  Service,
  Order,
  Review,
  Favorite,
  Notification,
  InvoiceRecord,
  WalletTransaction,
  Dispute,
  Milestone,
  Category,
  Subscription,
  WithdrawalRequest,
  Coupon,
  Portfolio
};
