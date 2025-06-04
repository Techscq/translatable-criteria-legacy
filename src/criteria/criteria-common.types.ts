import type { AliasOfSchema, CriteriaSchema } from './schema.types.js';
import type { CriteriaType } from './criteria.types.js';

export interface ICriteriaBase<
  CSchema extends CriteriaSchema,
  CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  TCriteriaType extends CriteriaType = CriteriaType,
> {
  type: TCriteriaType;
  alias: CurrentAlias;
}
