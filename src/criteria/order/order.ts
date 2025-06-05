export const OrderDirection = {
  ASC: 'ASC',
  DESC: 'DESC',
} as const;
export type OrderDirection = keyof typeof OrderDirection;
export type OrderByPrimitive<T extends string = string> = {
  direction: OrderDirection;
  field: T;
};

export class Order<T extends string = string> {
  constructor(
    protected readonly _direction: OrderDirection,
    protected readonly _field: T,
  ) {}

  get field(): T {
    return this._field;
  }

  get direction(): OrderDirection {
    return this._direction;
  }

  toPrimitive(): OrderByPrimitive<T> {
    return {
      direction: this._direction,
      field: this._field,
    };
  }
}
