import { RootCriteria } from './root.criteria.js';
import type { CriteriaSchema, SelectedAliasOf } from './types/schema.types.js';
import { InnerJoinCriteria } from './inner.join-criteria.js';
import { LeftJoinCriteria } from './left.join-criteria.js';
import { OuterJoinCriteria } from './outer.join-criteria.js';

export class CriteriaFactory {
  static GetCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): RootCriteria<CSchema, Alias> {
    return new RootCriteria(schema, alias);
  }
  static GetInnerJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): InnerJoinCriteria<CSchema, Alias> {
    return new InnerJoinCriteria(schema, alias);
  }
  static GetLeftJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): LeftJoinCriteria<CSchema, Alias> {
    return new LeftJoinCriteria(schema, alias);
  }
  static GetOuterJoinCriteria<
    CSchema extends CriteriaSchema,
    Alias extends SelectedAliasOf<CSchema>,
  >(schema: CSchema, alias: Alias): OuterJoinCriteria<CSchema, Alias> {
    return new OuterJoinCriteria(schema, alias);
  }
}
