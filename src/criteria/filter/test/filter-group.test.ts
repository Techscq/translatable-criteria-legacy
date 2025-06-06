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
  const filter3: FilterPrimitive = {
    field: 'name',
    operator: FilterOperator.LIKE,
    value: '%test%',
  };

  const initialEmptyAndGroup = new FilterGroup({
    logicalOperator: LogicalOperator.AND,
    items: [],
  });

  it('should be created from a primitive', () => {
    const groupPrimitive: FilterGroupPrimitive = {
      logicalOperator: LogicalOperator.AND,
      items: [filter1, filter2],
    };
    const filterGroup = new FilterGroup(groupPrimitive);
    expect(filterGroup).toBeInstanceOf(FilterGroup);
    expect(filterGroup.logicalOperator).toBe(LogicalOperator.AND);
    expect(filterGroup.items.length).toBe(2);
    expect(filterGroup.items[0]).toBeInstanceOf(Filter);
    expect(filterGroup.items[1]).toBeInstanceOf(Filter);
  });

  it('should handle nested filter groups', () => {
    const groupPrimitive: FilterGroupPrimitive = {
      logicalOperator: LogicalOperator.AND,
      items: [filter1, filter2],
    };
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
    const groupPrimitive: FilterGroupPrimitive = {
      logicalOperator: LogicalOperator.AND,
      items: [filter1, filter2],
    };
    const filterGroup = new FilterGroup(groupPrimitive);
    const resultPrimitive = filterGroup.toPrimitive();
    expect(resultPrimitive).toEqual(groupPrimitive);
  });

  describe('createInitial', () => {
    it('should create an AND group with the given filter', () => {
      const result = FilterGroup.createInitial(filter1);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1],
      });
    });
  });

  describe('addAnd', () => {
    it('should add filter to an initial empty AND group', () => {
      const result = initialEmptyAndGroup.addAnd(filter1);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1],
      });
    });

    it('should add filter to an existing AND group', () => {
      const currentGroup = FilterGroup.createInitial(filter1);
      const result = currentGroup.addAnd(filter2);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.AND,
        items: [filter1, filter2],
      });
    });

    it('should add filter to the last AND branch of an OR group', () => {
      const orGroup = FilterGroup.createInitial(filter1).addOr(filter2);
      const result = orGroup.addAnd(filter3);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          { logicalOperator: LogicalOperator.AND, items: [filter2, filter3] },
        ],
      });
    });

    it('should convert last primitive item in OR group to AND group and add filter', () => {
      const orGroupWithPrimitiveAsLastItem = new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter2] },
          filter1,
        ],
      });

      const result = orGroupWithPrimitiveAsLastItem.addAnd(filter3);

      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter2] },
          { logicalOperator: LogicalOperator.AND, items: [filter1, filter3] },
        ],
      });
    });

    it('should add a new AND branch if last item of OR group is an OR group', () => {
      const innerOrGroup: FilterGroupPrimitive = {
        logicalOperator: LogicalOperator.OR,
        items: [filter2],
      };
      const orGroup = new FilterGroup({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          innerOrGroup,
        ],
      });
      const result = orGroup.addAnd(filter3);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          innerOrGroup,
          { logicalOperator: LogicalOperator.AND, items: [filter3] },
        ],
      });
    });
  });

  describe('addOr', () => {
    it('should convert an initial empty AND group to OR( AND(filter) )', () => {
      const result = initialEmptyAndGroup.addOr(filter1);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [{ logicalOperator: LogicalOperator.AND, items: [filter1] }],
      });
    });

    it('should convert an existing AND group to OR ( currentAND, newAND(filter) )', () => {
      const currentGroup = FilterGroup.createInitial(filter1);
      const result = currentGroup.addOr(filter2);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          { logicalOperator: LogicalOperator.AND, items: [filter2] },
        ],
      });
    });

    it('should add a new AND(filter) branch to an existing OR group', () => {
      const orGroup = FilterGroup.createInitial(filter1).addOr(filter2);
      const result = orGroup.addOr(filter3);
      expect(result.toPrimitive()).toEqual({
        logicalOperator: LogicalOperator.OR,
        items: [
          { logicalOperator: LogicalOperator.AND, items: [filter1] },
          { logicalOperator: LogicalOperator.AND, items: [filter2] },
          { logicalOperator: LogicalOperator.AND, items: [filter3] },
        ],
      });
    });
  });
});
