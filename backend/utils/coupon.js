const { Coupon } = require('../models');

const validateAndComputeCoupon = async ({ code, amount }) => {
  if (!code) return { coupon: null, discount: 0, finalAmount: Number(amount || 0) };
  const coupon = await Coupon.findOne({ where: { code: String(code).trim().toUpperCase() } });
  if (!coupon) throw new Error('Invalid coupon code.');
  if (!coupon.isActive) throw new Error('Coupon is inactive.');
  if (new Date(coupon.expiryDate) < new Date()) throw new Error('Coupon has expired.');
  if (Number(coupon.usedCount) >= Number(coupon.maxUsage)) throw new Error('Coupon usage limit reached.');

  const base = Number(amount || 0);
  const rawDiscount =
    coupon.discountType === 'Percentage'
      ? (base * Number(coupon.discountValue || 0)) / 100
      : Number(coupon.discountValue || 0);
  const discount = Number(Math.max(0, Math.min(rawDiscount, base)).toFixed(2));
  const finalAmount = Number((base - discount).toFixed(2));

  return { coupon, discount, finalAmount };
};

module.exports = { validateAndComputeCoupon };
