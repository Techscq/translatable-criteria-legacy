import { Filter } from './filter/filter.js';
import { OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/filter.types.base.js';
import { FilterOperator } from './types/operators.types.js';

export class Cursor<TFields extends string> {
  filters: [Filter<TFields>, Filter<TFields>];
  order: OrderDirection;

  constructor(
    filterPrimitive: [
      Omit<FilterPrimitive<TFields>, 'operator'>,
      Omit<FilterPrimitive<TFields>, 'operator'>,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ) {
    for (const filter of filterPrimitive) {
      if (!filter.field) {
        throw new Error('Cursor field must be defined');
      }
      if (filter.value === undefined || filter.value === null) {
        throw new Error(
          `Cursor value for field ${filter.field} must be defined`,
        );
      }
    }
    if (filterPrimitive[0].field === filterPrimitive[1].field) {
      throw new Error('Cursor fields must be different');
    }

    this.filters = [
      new Filter({ ...filterPrimitive[0], operator: operator }),
      new Filter({ ...filterPrimitive[1], operator: operator }),
    ];
    this.order = order;
  }
}
