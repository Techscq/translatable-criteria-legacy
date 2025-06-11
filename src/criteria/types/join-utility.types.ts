import type {
  CriteriaSchema,
  JoinRelationType,
  SchemaJoins,
  SelectedAliasOf,
} from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';

import type { InnerJoinCriteria } from '../inner.join-criteria.js';
import type { LeftJoinCriteria } from '../left.join-criteria.js';
import type { OuterJoinCriteria } from '../outer.join-criteria.js';
import type { PivotJoinInput, SimpleJoinInput } from './join-input.types.js';
export type AnyJoinCriteria<
  CSchema extends CriteriaSchema,
  Alias extends SelectedAliasOf<CSchema> = SelectedAliasOf<CSchema>,
> =
  | InnerJoinCriteria<CSchema, Alias>
  | LeftJoinCriteria<CSchema, Alias>
  | OuterJoinCriteria<CSchema, Alias>;

export interface StoredJoinDetails<ParentSchema extends CriteriaSchema> {
  parameters:
    | PivotJoin<ParentSchema, CriteriaSchema, JoinRelationType>
    | SimpleJoin<ParentSchema, CriteriaSchema, JoinRelationType>;
  criteria: AnyJoinCriteria<CriteriaSchema, SelectedAliasOf<CriteriaSchema>>;
}

export type JoinCriteriaParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  ActualJoinedAlias extends SelectedAliasOf<JoinedSchema>,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? `Error: The alias '${ActualJoinedAlias}' of schema '${JoinedSchema['source_name']}' is not configured for join in '${ParentSchema['source_name']}'.`
  : AnyJoinCriteria<JoinedSchema, ActualJoinedAlias>;

export type JoinParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? never
  : MatchingConfigForActualAlias['join_relation_type'] extends 'many_to_many'
    ? PivotJoinInput<ParentSchema, JoinedSchema>
    : SimpleJoinInput<ParentSchema, JoinedSchema>;

export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificAlias extends string,
> = Extract<
  ParentSchema['joins'][number],
  { alias: JoinedSchemaSpecificAlias }
>;
