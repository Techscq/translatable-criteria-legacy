import { Order, type OrderByPrimitive, OrderDirection } from '../order.js';

describe('Order', () => {
  const primitive: OrderByPrimitive = {
    field: 'createdAt',
    direction: OrderDirection.DESC,
  };

  it('should be created with field and direction', () => {
    const order = new Order(primitive.direction, primitive.field);
    expect(order).toBeInstanceOf(Order);
    expect(order.field).toBe('createdAt');
    expect(order.direction).toBe(OrderDirection.DESC);
  });

  it('should return its primitive representation', () => {
    const order = new Order(primitive.direction, primitive.field);
    const resultPrimitive = order.toPrimitive();
    expect(resultPrimitive).toEqual(primitive);
  });
});
