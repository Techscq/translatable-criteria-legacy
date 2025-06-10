import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../filter/types/filter-primitive.types.js';
import type { ICriteriaVisitor } from './visitor-interface.types.js';

export interface IFilterExpression {
  toPrimitive(): FilterPrimitive | FilterGroupPrimitive;
  accept<Source, Output = Source>(
    visitor: ICriteriaVisitor<Source, Output>,
    context: Source,
  ): Output | Promise<Output>;
}
