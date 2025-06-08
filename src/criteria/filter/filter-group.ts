import { LogicalOperator } from '../types/operators.types.js';
import { Filter } from './filter.js';
import type {
  FilterGroupPrimitive,
  FilterPrimitive,
  IFilterExpression,
  IFilterVisitor,
} from './filter.types.base.js';
import { FilterNormalizer } from './filter-utils.js';

export class FilterGroup<T extends string = string>
  implements IFilterExpression
{
  private readonly _logicalOperator: LogicalOperator;
  private readonly _items: ReadonlyArray<Filter<T> | FilterGroup<T>>;

  constructor(filterGroupPrimitive: FilterGroupPrimitive<T>) {
    const normalizedGroup =
      FilterNormalizer.normalizeGroup(filterGroupPrimitive);
    this._logicalOperator = normalizedGroup.logicalOperator;
    this._items = normalizedGroup.items.map((item) => {
      if ('logicalOperator' in item) {
        return new FilterGroup(item);
      }
      return new Filter(item);
    });
  }

  get items(): ReadonlyArray<Filter<T> | FilterGroup<T>> {
    return this._items;
  }

  get logicalOperator(): LogicalOperator {
    return this._logicalOperator;
  }

  static createInitial<T extends string = string>(
    filterPrimitive: FilterPrimitive<T>,
  ): FilterGroup<T> {
    return new FilterGroup({
      logicalOperator: LogicalOperator.AND,
      items: [filterPrimitive],
    });
  }

  toPrimitive(): FilterGroupPrimitive<T> {
    return {
      logicalOperator: this._logicalOperator,
      items: this._items.map((item) => item.toPrimitive()),
    };
  }

  addAnd(filterPrimitive: FilterPrimitive<T>): FilterGroup<T> {
    if (this._logicalOperator === LogicalOperator.AND) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [
          ...this._items.map((item) => item.toPrimitive()),
          filterPrimitive,
        ],
      });
    }

    // For OR groups, we need to add to the last AND group or create a new one
    const currentItems = this._items.map((item) => item.toPrimitive());
    const lastItem = currentItems[currentItems.length - 1];

    if (
      !lastItem ||
      !('logicalOperator' in lastItem) ||
      lastItem.logicalOperator !== LogicalOperator.AND
    ) {
      currentItems.push({
        logicalOperator: LogicalOperator.AND,
        items: [filterPrimitive],
      });
    } else {
      currentItems[currentItems.length - 1] = {
        logicalOperator: LogicalOperator.AND,
        items: [...lastItem.items, filterPrimitive],
      };
    }

    return new FilterGroup({
      logicalOperator: LogicalOperator.OR,
      items: currentItems,
    });
  }

  addOr(filterPrimitive: FilterPrimitive<T>): FilterGroup<T> {
    const currentItems = this._items.map((item) => item.toPrimitive());

    // Convert current structure to OR if needed
    if (this._logicalOperator === LogicalOperator.AND) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [
          ...(currentItems.length > 0
            ? [
                {
                  logicalOperator: LogicalOperator.AND,
                  items: currentItems,
                },
              ]
            : []),
          {
            logicalOperator: LogicalOperator.AND,
            items: [filterPrimitive],
          },
        ],
      });
    }

    // Add new AND branch to existing OR
    return new FilterGroup({
      logicalOperator: LogicalOperator.OR,
      items: [
        ...currentItems,
        {
          logicalOperator: LogicalOperator.AND,
          items: [filterPrimitive],
        },
      ],
    });
  }

  accept<Source, Output = Source>(
    visitor: IFilterVisitor<Source, Output>,
    context: Source,
  ): Output | Promise<Output> {
    return this.logicalOperator === LogicalOperator.AND
      ? visitor.visitAndGroup(this, context)
      : visitor.visitOrGroup(this, context);
  }
}
