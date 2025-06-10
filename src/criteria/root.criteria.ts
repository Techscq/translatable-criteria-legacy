import { Criteria } from './criteria.js';
import type { CriteriaSchema, SelectedAliasOf } from './types/schema.types.js';
import type { ICriteriaVisitor } from './types/visitor-interface.types.js';

export class RootCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema>,
> extends Criteria<CSchema, Alias> {
  accept<Context, Result>(
    visitor: ICriteriaVisitor<Context, Result>,
    context: Context,
  ): Result | Promise<Result> {
    return visitor.visitRoot(this, context);
  }
}
