import type {
  FilterGroupPrimitive,
  FilterPrimitive,
} from '../filter/types/filter-primitive.types.js';
import type { ICriteriaVisitor } from './visitor-interface.types.js';

export interface IFilterExpression {
  toPrimitive(): FilterPrimitive | FilterGroupPrimitive;
  accept<TranslationContext, TranslationOutput = TranslationContext>(
    visitor: ICriteriaVisitor<TranslationContext, TranslationOutput>,
    currentAlias: string,
    context: TranslationContext,
  ): TranslationOutput;
}
