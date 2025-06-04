import { LogicalOperator } from './criteria.types.js';
import { Filter, type FilterPrimitive } from './filter.js';

export type FilterGroupPrimitive<T extends string = string> = {
  readonly logicalOperator: LogicalOperator;
  readonly items: ReadonlyArray<FilterPrimitive<T> | FilterGroupPrimitive>;
};
export class FilterGroup {
  readonly _logicalOperator: LogicalOperator;
  readonly _items: ReadonlyArray<Filter | FilterGroup>;

  constructor(filterGroupPrimitive: FilterGroupPrimitive) {
    this._logicalOperator = filterGroupPrimitive.logicalOperator;
    this._items = filterGroupPrimitive.items.map((item) => {
      if ('logicalOperator' in item) {
        return new FilterGroup(item);
      }
      return new Filter(item);
    });
  }

  get items(): ReadonlyArray<Filter | FilterGroup> {
    return this._items;
  }

  toPrimitive(): FilterGroupPrimitive {
    return {
      logicalOperator: this._logicalOperator,
      items: this._items.map((item) => {
        if (item instanceof FilterGroup) {
          return item.toPrimitive();
        }
        return item.toPrimitive();
      }),
    };
  }

  get logicalOperator(): LogicalOperator {
    return this._logicalOperator;
  }

  private static FromPrimitive(groupPrimitive: FilterGroupPrimitive) {
    return new FilterGroup(groupPrimitive);
  }

  static getUpdatedFilter(
    currentRootPrimitive: FilterGroupPrimitive | undefined,
    operation: 'replace' | 'and' | 'or',
    newFilterOrGroup: FilterPrimitive | FilterGroupPrimitive,
  ): FilterGroup {
    if (
      !(operation === 'replace' || operation === 'and' || operation === 'or')
    ) {
      throw new Error('Invalid operation');
    }

    const newItemGroupPrimitive: FilterGroupPrimitive =
      'logicalOperator' in newFilterOrGroup
        ? newFilterOrGroup
        : { logicalOperator: LogicalOperator.AND, items: [newFilterOrGroup] };

    if (operation === 'replace') {
      return FilterGroup.FromPrimitive(newItemGroupPrimitive);
    }

    if (!currentRootPrimitive) {
      if (operation === 'or') {
        return newItemGroupPrimitive.logicalOperator === LogicalOperator.OR
          ? FilterGroup.FromPrimitive(newItemGroupPrimitive)
          : FilterGroup.FromPrimitive({
              logicalOperator: LogicalOperator.OR,
              items: [newItemGroupPrimitive],
            });
      }
      return FilterGroup.FromPrimitive(newItemGroupPrimitive);
    }

    const resultingLogicalOperator =
      operation === 'and' ? LogicalOperator.AND : LogicalOperator.OR;

    return FilterGroup.FromPrimitive({
      logicalOperator: resultingLogicalOperator,
      items: [currentRootPrimitive, newItemGroupPrimitive],
    });
  }
}
