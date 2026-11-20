import type { CouponKind, Order, Role, State } from './types';

export const couponLocations = {
  parking: [
    { id: 'parking-5', name: 'پارکینگ طرف قرارداد نمونهٔ ناحیهٔ ۵' },
    { id: 'parking-4', name: 'پارکینگ طرف قرارداد نمونهٔ ناحیهٔ ۴' },
  ],
  shahrvand: [{ id: 'shahrvand-demo', name: 'پذیرندهٔ نمونهٔ فروشگاه شهروند' }],
} satisfies Record<CouponKind, { id: string; name: string }[]>;

function orderCoupons(order: Order) {
  return order.lines.flatMap(({ product, quantity }) => {
    const kind =
      product.coupon ?? (product.id === 'parking' ? 'parking' : undefined);
    if (!kind) return [];
    return Array.from({ length: quantity }, (_, index) => ({
      id: [order.id, product.id, index + 1].join('/'),
      name: product.name,
      kind,
      value: product.price,
    }));
  });
}

export function ownedCoupons(state: State, owner: Role) {
  return state.orders
    .filter((order) => order.buyer === owner)
    .flatMap(orderCoupons)
    .map((coupon) => ({
      ...coupon,
      used: state.couponsUsed?.find((use) => use.couponId === coupon.id),
    }));
}
