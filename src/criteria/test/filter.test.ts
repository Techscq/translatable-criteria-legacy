import { Filter, type FilterPrimitive } from '../filter.js';
import { FilterOperator } from '../criteria.types.js';

describe('Filter', () => {
  const primitive: FilterPrimitive = {
    field: 'name',
    operator: FilterOperator.EQUALS,
    value: 'test',
  };

  it('should be created from a primitive', () => {
    const filter = new Filter(primitive);
    expect(filter).toBeInstanceOf(Filter);
    expect(filter.field).toBe('name');
    expect(filter.operator).toBe(FilterOperator.EQUALS);
    expect(filter.value).toBe('test');
  });

  it('should return its primitive representation', () => {
    const filter = new Filter(primitive);
    const resultPrimitive = filter.toPrimitive();
    expect(resultPrimitive).toEqual(primitive);
  });
});
