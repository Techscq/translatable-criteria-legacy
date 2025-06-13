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

  accept<
    TranslationContext,
    TranslationOutput = TranslationContext,
    TFilterVisitorOutput extends any = any,
  >(
    visitor: ICriteriaVisitor<
      TranslationContext,
      TranslationOutput,
      TFilterVisitorOutput
    >,
    currentAlias: string,
  ): TFilterVisitorOutput {
    return visitor.visitFilter(this, currentAlias);
  }

  toPrimitive(): FilterPrimitive<T> {
    return {
      field: this.field,
      operator: this.operator,
      value: this.value,
    };
  }
}
