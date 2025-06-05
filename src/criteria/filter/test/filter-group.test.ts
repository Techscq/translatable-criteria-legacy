import { Filter, type FilterPrimitive } from '../filter.js';
import { FilterOperator, LogicalOperator } from '../../types/criteria.types.js';
import { FilterGroup, type FilterGroupPrimitive } from '../filter-group.js';

describe('FilterGroup', () => {
  const filter1: FilterPrimitive = {
    field: 'id',
    operator: FilterOperator.EQUALS,
    value: 1,
  };
  const filter2: FilterPrimitive = {
    field: 'status',
    operator: FilterOperator.EQUALS,
    value: 'active',
  };

  const groupPrimitive: FilterGroupPrimitive = {
    logicalOperator: LogicalOperator.AND,
    items: [filter1, filter2],
  };

  it('should be created from a primitive', () => {
    const filterGroup = new FilterGroup(groupPrimitive);
    expect(filterGroup).toBeInstanceOf(FilterGroup);
    expect(filterGroup.logicalOperator).toBe(LogicalOperator.AND);
    expect(filterGroup.items.length).toBe(2);
    expect(filterGroup.items[0]).toBeInstanceOf(Filter);
    expect(filterGroup.items[1]).toBeInstanceOf(Filter);
  });

  it('should handle nested filter groups', () => {
    const nestedGroupPrimitive: FilterGroupPrimitive = {
      logicalOperator: LogicalOperator.OR,
      items: [groupPrimitive, filter1],
    };
    const filterGroup = new FilterGroup(nestedGroupPrimitive);
    expect(filterGroup.logicalOperator).toBe(LogicalOperator.OR);
    expect(filterGroup.items.length).toBe(2);
    expect(filterGroup.items[0]).toBeInstanceOf(FilterGroup);
    expect(filterGroup.items[1]).toBeInstanceOf(Filter);
  });

  it('should return its primitive representation', () => {
    const filterGroup = new FilterGroup(groupPrimitive);
    const resultPrimitive = filterGroup.toPrimitive();
    expect(resultPrimitive).toEqual(groupPrimitive);
  });

  describe('getUpdatedFilter', () => {
    it('should replace filter when current is undefined', () => {
      const result = FilterGroup.getUpdatedFilter(
        undefined,
        'replace',
        filter1,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1],
      });
    });

    it('should replace filter when current exists', () => {
      const currentGroup = new FilterGroup(groupPrimitive);
      const result = FilterGroup.getUpdatedFilter(
        currentGroup.toPrimitive(),
        'replace',
        filter1,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1],
      });
    });

    it('should replace with a group', () => {
      const result = FilterGroup.getUpdatedFilter(
        undefined,
        'replace',
        groupPrimitive,
      );
      expect(result.toPrimitive()).toEqual(groupPrimitive);
    });

    it('should AND a filter when current is undefined', () => {
      const result = FilterGroup.getUpdatedFilter(undefined, 'and', filter1);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1],
      });
    });

    it('should AND a filter when current exists (as single filter group)', () => {
      const currentSingleFilterGroup: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [filter2],
      };
      const result = FilterGroup.getUpdatedFilter(
        currentSingleFilterGroup,
        'and',
        filter1,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [
          currentSingleFilterGroup,
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
        ],
      });
    });

    it('should AND a group when current exists', () => {
      const currentGroup = new FilterGroup(groupPrimitive);
      const result = FilterGroup.getUpdatedFilter(
        currentGroup.toPrimitive(),
        'and',
        filter1,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [
          currentGroup.toPrimitive(),
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
        ],
      });
    });

    it('should OR a filter when current is undefined', () => {
      const result = FilterGroup.getUpdatedFilter(undefined, 'or', filter1);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [{ logicalOperator: LogicalOperator.AND, items: [filter1] }],
      });
    });

    it('should OR a filter when current exists (as single filter group)', () => {
      const currentSingleFilterGroup: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [filter2],
      };
      const result = FilterGroup.getUpdatedFilter(
        currentSingleFilterGroup,
        'or',
        filter1,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          currentSingleFilterGroup,
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
        ],
      });
    });

    it('should OR a group when current exists', () => {
      const currentGroupPrimitive: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.AND,
        items: [filter2],
      };
      const currentGroup = new FilterGroup(currentGroupPrimitive);

      const result = FilterGroup.getUpdatedFilter(
        currentGroup.toPrimitive(),
        'or',
        groupPrimitive,
      );
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [currentGroup.toPrimitive(), groupPrimitive],
      });
    });

    it('should throw error for invalid operation', () => {
      expect(() =>
        FilterGroup.getUpdatedFilter(undefined, 'invalid' as any, filter1),
      ).toThrow('Invalid operation');
    });
  });
});
