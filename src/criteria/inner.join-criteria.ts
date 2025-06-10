import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from './types/schema.types.js';
import type { PivotJoin, SimpleJoin } from './types/join-parameter.types.js';
import { Criteria } from './criteria.js';
import type { ICriteriaVisitor } from './types/visitor-interface.types.js';

export class InnerJoinCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema> = SelectedAliasOf<CSchema>,
> extends Criteria<CSchema, Alias> {
  accept<Context, Result>(
    visitor: ICriteriaVisitor<Context, Result>,
    parameters:
      | PivotJoin<CriteriaSchema, CSchema, JoinRelationType>
      | SimpleJoin<CriteriaSchema, CSchema, JoinRelationType>,
    context: Context,
  ): Result | Promise<Result> {
    return visitor.visitInnerJoin(this, parameters, context);
  }
}
