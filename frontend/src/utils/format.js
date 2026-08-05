/** Indian numbering: 1,49,999 rather than 149,999. */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export const formatPrice = (value) => inr.format(value);

/** Whole-number discount, or null when there is nothing to shout about. */
export const discountPercent = (price, mrp) => {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
};
