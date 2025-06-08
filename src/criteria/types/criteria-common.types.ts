import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
  SchemaJoins,
} from './schema.types.js';
import { type CriteriaType, FilterOperator } from './criteria.types.js';
import { type Order, OrderDirection } from '../order/order.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { PivotJoin, SimpleJoin } from './join.types.js';
import type { FilterPrimitive } from '../filter/filter.types.base.js';
import type { Cursor } from '../cursor.js';

export interface StoredJoinDetails<ParentSchema extends CriteriaSchema> {
  type: Exclude<
    (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
    typeof CriteriaType.ROOT
  >;
  parameters:
    | PivotJoin<ParentSchema, CriteriaSchema, JoinRelationType>
    | SimpleJoin<ParentSchema, CriteriaSchema, JoinRelationType>;
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
  selectAll(): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;

  setCursor(
    filterPrimitive: [
      Omit<FilterPrimitive<FieldOfSchema<CSchema>>, 'operator'>,
      Omit<FilterPrimitive<FieldOfSchema<CSchema>>, 'operator'>,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  get cursor(): Cursor<FieldOfSchema<CSchema>> | undefined;
  setSelect(
    selectFields: Array<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  get select(): Array<FieldOfSchema<CSchema>>;
  orderBy(
    field: FieldOfSchema<CSchema>,
    direction: OrderDirection,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  setTake(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  setSkip(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  get joins(): Array<[string, StoredJoinDetails<CSchema>]>;
  get rootFilterGroup(): FilterGroup;
  get type(): TCriteriaType;
  get alias(): CurrentAlias;
  get sourceName(): CSchema['source_name'];
  get take(): number;
  get skip(): number;
  get orders(): readonly Order[];
  where(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  andWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>;
  orWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
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
  accept<Context, Result>(
    visitor: ICriteriaVisitor<Context, Result>,
    context: Context,
  ): Result | Promise<Result>;
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
  : MatchingJoinConfig['join_relation_type'] extends 'many_to_many'
    ? PivotJoin<
        ParentSchema,
        JoinedSchema,
        MatchingJoinConfig['join_relation_type']
      >
    : SimpleJoin<
        ParentSchema,
        JoinedSchema,
        MatchingJoinConfig['join_relation_type']
      >;

export type SpecificMatchingJoinConfig<
  ParentSchema extends CriteriaSchema,
  JoinedSchemaSpecificAlias extends string,
> = Extract<
  ParentSchema['joins'][number],
  { alias: JoinedSchemaSpecificAlias }
>;

export interface ICriteriaVisitor<Context, Result> {
  visitRoot(
    criteria: ICriteriaBase<CriteriaSchema, string, typeof CriteriaType.ROOT>,
    context: Context,
  ): Result | Promise<Result>;

  visitInnerJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.INNER_JOIN
    >,
    context: Context,
  ): Result | Promise<Result>;

  visitLeftJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.LEFT_JOIN
    >,
    context: Context,
  ): Result | Promise<Result>;

  visitFullOuterJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.FULL_OUTER
    >,
    context: Context,
  ): Result | Promise<Result>;
}
