import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from './types/schema.types.js';
import type { PivotJoin, SimpleJoin } from './types/join-parameter.types.js';
import { Criteria } from './criteria.js';
import type { ICriteriaVisitor } from './types/visitor-interface.types.js';

export class LeftJoinCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema> = SelectedAliasOf<CSchema>,
> extends Criteria<CSchema, Alias> {
  accept<TranslationContext, TranslationOutput>(
    visitor: ICriteriaVisitor<TranslationContext, TranslationOutput>,
    parameters:
      | PivotJoin<CriteriaSchema, CSchema, JoinRelationType>
      | SimpleJoin<CriteriaSchema, CSchema, JoinRelationType>,
    context: TranslationContext,
  ): TranslationOutput {
    return visitor.visitLeftJoin(this, parameters, context);
  }
}
