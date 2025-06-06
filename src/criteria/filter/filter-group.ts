import { LogicalOperator } from '../types/operators.types.js';
import { Filter, type FilterPrimitive } from './filter.js';

export type FilterGroupPrimitive<T extends string = string> = {
  readonly logicalOperator: LogicalOperator;
  readonly items: ReadonlyArray<FilterPrimitive<T> | FilterGroupPrimitive<T>>;
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

  get logicalOperator(): LogicalOperator {
    return this._logicalOperator;
  }

  /**
   * Creates the initial FilterGroup, typically for a 'where' clause.
   * The root is an AND group with the single new filter.
   */
  public static createInitial(
    newFilterPrimitive: FilterPrimitive,
  ): FilterGroup {
    return new FilterGroup({
      logicalOperator: LogicalOperator.AND,
      items: [newFilterPrimitive],
    });
  }

  toPrimitive(): FilterGroupPrimitive {
    return {
      logicalOperator: this._logicalOperator,
      items: this._items.map((item) => item.toPrimitive()),
    };
  }

  /**
   * Adds a filter with an AND condition to the current group.
   * Returns a new FilterGroup instance.
   */
  public addAnd(newFilterPrimitive: FilterPrimitive): FilterGroup {
    const currentRootPrimitive = this.toPrimitive();

    if (
      currentRootPrimitive.items.length === 0 &&
      currentRootPrimitive.logicalOperator === LogicalOperator.AND
    ) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [newFilterPrimitive],
      });
    }

    if (currentRootPrimitive.logicalOperator === LogicalOperator.AND) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.AND,
        items: [...currentRootPrimitive.items, newFilterPrimitive],
      });
    } else {
      const currentItems = [...currentRootPrimitive.items];
      if (currentItems.length === 0) {
        return new FilterGroup({
          logicalOperator: LogicalOperator.OR,
          items: [
            {
              logicalOperator: LogicalOperator.AND,
              items: [newFilterPrimitive],
            },
          ],
        });
      }

      const lastItemIndex = currentItems.length - 1;
      const originalLastItem = currentItems[lastItemIndex]!;
      let newLastBranch: FilterGroupPrimitive;

      if (
        'logicalOperator' in originalLastItem &&
        originalLastItem.logicalOperator === LogicalOperator.AND
      ) {
        newLastBranch = {
          ...originalLastItem,
          items: [...originalLastItem.items, newFilterPrimitive],
        };
      } else if (!('logicalOperator' in originalLastItem)) {
        newLastBranch = {
          logicalOperator: LogicalOperator.AND,
          items: [originalLastItem, newFilterPrimitive],
        };
      } else {
        currentItems.push({
          logicalOperator: LogicalOperator.AND,
          items: [newFilterPrimitive],
        });
        return new FilterGroup({
          logicalOperator: LogicalOperator.OR,
          items: currentItems,
        });
      }
      currentItems[lastItemIndex] = newLastBranch;
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: currentItems,
      });
    }
  }

  /**
   * Adds a filter with an OR condition to the current group.
   * Returns a new FilterGroup instance.
   */
  public addOr(newFilterPrimitive: FilterPrimitive): FilterGroup {
    const currentRootPrimitive = this.toPrimitive();
    const newBranchForOr: FilterGroupPrimitive = {
      logicalOperator: LogicalOperator.AND,
      items: [newFilterPrimitive],
    };

    if (
      currentRootPrimitive.items.length === 0 &&
      currentRootPrimitive.logicalOperator === LogicalOperator.AND
    ) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [newBranchForOr],
      });
    }

    if (currentRootPrimitive.logicalOperator === LogicalOperator.OR) {
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [...currentRootPrimitive.items, newBranchForOr],
      });
    } else {
      return new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [currentRootPrimitive, newBranchForOr],
      });
    }
  }
}
