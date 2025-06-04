import type {
  AliasOfSchema,
  CriteriaSchema,
  SchemaJoins,
} from './schema.types.js';
import type { CriteriaType } from './criteria.types.js';
import type { PivotJoin, SimpleJoin } from './join.types.js';
import type { ICriteriaBase } from './criteria-common.types.js';

export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificAlias extends string,
> = Extract<
  ParentSchema['joins'][number],
  { alias: JoinedSchemaSpecificAlias }
>;

export type JoinCriteriaParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  ActualJoinedAlias extends AliasOfSchema<JoinedSchema>,
  MatchingConfigForActualAlias extends SchemaJoins<string> | never,
> = [MatchingConfigForActualAlias] extends [never]
  ? `Error: The alias '${ActualJoinedAlias}' of schema '${JoinedSchema['source_name']}' is not configured for join in '${ParentSchema['source_name']}'.`
  : ICriteriaBase<
      JoinedSchema,
      ActualJoinedAlias,
      Exclude<
        (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
        typeof CriteriaType.ROOT
      >
    >;

export type JoinParameterType<
  ParentSchema extends CriteriaSchema,
  JoinedSchema extends CriteriaSchema,
  MatchingJoinConfig extends SchemaJoins<string> | never,
> = [MatchingJoinConfig] extends [never]
  ? never
  : MatchingJoinConfig['with_pivot'] extends true
    ? PivotJoin<ParentSchema, JoinedSchema>
    : SimpleJoin<ParentSchema, JoinedSchema>;

export interface StoredJoinDetails<ParentSchema extends CriteriaSchema> {
  type: Exclude<
    (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
    typeof CriteriaType.ROOT
  >;
  parameters:
    | PivotJoin<ParentSchema, CriteriaSchema>
    | SimpleJoin<ParentSchema, CriteriaSchema>;
  criteria: ICriteriaBase<
    CriteriaSchema,
    AliasOfSchema<CriteriaSchema>,
    Exclude<
      (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
      typeof CriteriaType.ROOT
    >
  >;
}
