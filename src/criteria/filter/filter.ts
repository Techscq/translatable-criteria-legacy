import type { FilterOperator } from '../types/operator.types.js';
import type { IFilterExpression } from '../types/filter-expression.interface.js';
import type {
  FilterPrimitive,
  FilterValue,
} from './types/filter-primitive.types.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

export class Filter<T extends string = string> implements IFilterExpression {
  constructor(private readonly primitive: FilterPrimitive<T>) {}

  get field(): T {
    return this.primitive.field;
  }

  get operator(): FilterOperator {
    return this.primitive.operator;
  }

  get value(): FilterValue {
    return this.primitive.value;
  }

  accept<Source, Output = Source>(
    visitor: ICriteriaVisitor<Source, Output>,
    context: Source,
  ): Output | Promise<Output> {
    return visitor.visitFilter(this, context);
  }

  toPrimitive(): FilterPrimitive<T> {
    return {
      field: this.field,
      operator: this.operator,
      value: this.value,
    };
  }
}
