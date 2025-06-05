import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
  SchemaJoins,
} from './schema.types.js';
import type { CriteriaType } from './criteria.types.js';
import { type Order, OrderDirection } from '../order/order.js';
import type { FilterPrimitive } from '../filter/filter.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { PivotJoin, SimpleJoin } from './join.types.js';

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

export interface ICriteriaBase<
  CSchema extends CriteriaSchema,
  CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  TCriteriaType extends CriteriaType = CriteriaType,
> {
  orderBy(
    field: FieldOfSchema<CSchema>,
    direction: OrderDirection,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  setTake(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  setSkip(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  get joins(): Array<[string, StoredJoinDetails<CSchema>]>;
  get rootFilterGroup(): FilterGroup | undefined;
  get type(): TCriteriaType;
  get alias(): CurrentAlias;
  get sourceName(): CSchema['source_name'];
  get take(): number;
  get skip(): number;
  get orders(): readonly Order[];
  where(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  join<
    JoinSchema extends CriteriaSchema,
    JoinedCriteriaAlias extends AliasOfSchema<JoinSchema>,
    TMatchingJoinConfig extends SpecificMatchingJoinConfig<
      CSchema,
      JoinedCriteriaAlias
    >,
  >(
    criteriaToJoin: JoinCriteriaParameterType<
      CSchema,
      JoinSchema,
      JoinedCriteriaAlias,
      TMatchingJoinConfig
    >,
    joinParameter: JoinParameterType<CSchema, JoinSchema, TMatchingJoinConfig>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
}

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

export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificAlias extends string,
> = Extract<
  ParentSchema['joins'][number],
  { alias: JoinedSchemaSpecificAlias }
>;
