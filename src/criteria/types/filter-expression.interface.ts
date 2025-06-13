import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../filter/types/filter-primitive.types.js';

export interface IFilterExpression {
  toPrimitive(): FilterPrimitive | FilterGroupPrimitive;
}
