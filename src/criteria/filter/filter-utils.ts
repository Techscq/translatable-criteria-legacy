import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from './types/filter-primitive.types.js';
import { LogicalOperator } from '../types/operator.types.js';

export class FilterNormalizer {
  static normalizeGroup<T extends string = string>(
    group: FilterGroupPrimitive<T>,
  ): FilterGroupPrimitive<T> {
    const normalizeCache = new WeakMap<
      FilterGroupPrimitive<T>,
      FilterGroupPrimitive<T>
    >();

    const normalizeInternal = (
      current: FilterGroupPrimitive<T>,
    ): FilterGroupPrimitive<T> => {
      const cached = normalizeCache.get(current);
      if (cached) return cached;

      if (!current.items?.length) {
        const result = {
          logicalOperator: LogicalOperator.AND,
          items: [],
        };
        normalizeCache.set(current, result);
        return result;
      }

      const normalized = current.items.reduce<
        Array<FilterPrimitive<T> | FilterGroupPrimitive<T>>
      >((acc, item) => {
        if (!('logicalOperator' in item)) {
          acc.push(item);
          return acc;
        }

        const normalizedChild = normalizeInternal(item);

        if (normalizedChild.items.length === 0) {
          return acc;
        }

        if (normalizedChild.logicalOperator === current.logicalOperator) {
          acc.push(...normalizedChild.items);
        } else {
          acc.push(normalizedChild);
        }

        return acc;
      }, []);

      let result: FilterGroupPrimitive<T>;

      if (normalized.length === 0) {
        result = {
          logicalOperator: LogicalOperator.AND,
          items: [],
        };
      } else if (normalized.length === 1 && normalized[0] !== undefined) {
        const singleItem = normalized[0];
        if ('logicalOperator' in singleItem) {
          result = singleItem as FilterGroupPrimitive<T>;
        } else {
          result = {
            logicalOperator: current.logicalOperator,
            items: [singleItem],
          };
        }
      } else {
        result = {
          logicalOperator: current.logicalOperator,
          items: normalized,
        };
      }

      normalizeCache.set(current, result);
      return result;
    };

    return normalizeInternal(group);
  }
}
