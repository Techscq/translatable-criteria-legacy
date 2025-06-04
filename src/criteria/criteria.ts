import { FilterGroup } from './filter-group.js';
import type { FilterPrimitive } from './filter.js';
import {
  type AliasOfSchema,
  type CriteriaSchema,
  CriteriaType,
  type FieldOfSchema,
  type PivotJoin,
  type SchemaJoins,
  type SimpleJoin,
  type CriteriaType as CriteriaTypeAlias,
} from './criteria.types.js';
import { Order } from './order.js';

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
  : Criteria<
      JoinedSchema,
      ActualJoinedAlias,
      Exclude<CriteriaTypeAlias, typeof CriteriaType.ROOT>
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
  type: Exclude<CriteriaTypeAlias, typeof CriteriaType.ROOT>;
  parameters:
    | PivotJoin<ParentSchema, CriteriaSchema>
    | SimpleJoin<ParentSchema, CriteriaSchema>;
  criteria: Criteria<
    CriteriaSchema,
    AliasOfSchema<CriteriaSchema>,
    Exclude<CriteriaTypeAlias, typeof CriteriaType.ROOT>
  >;
}

export class Criteria<
  CSchema extends CriteriaSchema,
  CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  TCriteriaType extends CriteriaTypeAlias = CriteriaTypeAlias,
> {
  protected _joins: Map<string, StoredJoinDetails<CSchema>> = new Map();
  private readonly _take: number = 1;
  private readonly _skip: number = 0;
  private readonly _orders: ReadonlyArray<Order<string>> = [];
  private _rootFilterGroup?: FilterGroup;

  protected constructor(
    protected readonly _schema: CSchema,
    protected _alias: CurrentAlias,
    protected _criteriaType: TCriteriaType,
  ) {}

  get type() {
    return this._criteriaType;
  }
  get schema() {
    return this._schema;
  }

  get orders() {
    return this._orders;
  }

  get take() {
    return this._take;
  }

  get skip() {
    return this._skip;
  }

  get rootFilterGroup() {
    return this._rootFilterGroup;
  }

  get joins(): Array<[string, StoredJoinDetails<CSchema>]> {
    return Array.from(this._joins.entries());
  }

  get sourceName() {
    return this.schema.source_name;
  }

  get alias() {
    return this._alias;
  }

  static Create<
    CSchema extends CriteriaSchema,
    CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  >(
    criteriaSchema: CSchema,
    alias: CurrentAlias,
  ): Criteria<CSchema, CurrentAlias, typeof CriteriaType.ROOT> {
    return new Criteria(criteriaSchema, alias, CriteriaType.ROOT);
  }

  static CreateInnerJoin<
    CSchema extends CriteriaSchema,
    CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  >(
    criteriaSchema: CSchema,
    alias: CurrentAlias,
  ): Criteria<CSchema, CurrentAlias, typeof CriteriaType.JOIN.INNER_JOIN> {
    return new Criteria(criteriaSchema, alias, CriteriaType.JOIN.INNER_JOIN);
  }

  static CreateLeftJoin<
    CSchema extends CriteriaSchema,
    CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  >(
    criteriaSchema: CSchema,
    alias: CurrentAlias,
  ): Criteria<CSchema, CurrentAlias, typeof CriteriaType.JOIN.LEFT_JOIN> {
    return new Criteria(criteriaSchema, alias, CriteriaType.JOIN.LEFT_JOIN);
  }

  static CreateFullOuterJoin<
    CSchema extends CriteriaSchema,
    CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  >(
    criteriaSchema: CSchema,
    alias: CurrentAlias,
  ): Criteria<CSchema, CurrentAlias, typeof CriteriaType.JOIN.FULL_OUTER> {
    return new Criteria(criteriaSchema, alias, CriteriaType.JOIN.FULL_OUTER);
  }

  private getNewRootFilterGroup(
    operation: 'replace' | 'and' | 'or',
    newFilterOrGroup: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): FilterGroup {
    return FilterGroup.getUpdatedFilter(
      this._rootFilterGroup?.toPrimitive(),
      operation,
      newFilterOrGroup,
    );
  }

  public where(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'replace',
      filterOrGroupPrimitive,
    );
    return this;
  }

  public andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'and',
      filterOrGroupPrimitive,
    );
    return this;
  }

  public orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'or',
      filterOrGroupPrimitive,
    );
    return this;
  }

  join<
    JoinSchema extends CriteriaSchema,
    JoinedCriteriaAlias extends AliasOfSchema<JoinSchema>,
    TMatchingJoinConfig extends SpecificMatchingJoinConfig<
      CSchema,
      JoinedCriteriaAlias
    > = SpecificMatchingJoinConfig<CSchema, JoinedCriteriaAlias>,
  >(
    criteriaToJoin: JoinCriteriaParameterType<
      CSchema,
      JoinSchema,
      JoinedCriteriaAlias,
      TMatchingJoinConfig
    >,
    joinParameter: JoinParameterType<CSchema, JoinSchema, TMatchingJoinConfig>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    if (criteriaToJoin instanceof Criteria) {
      const joinDetails: StoredJoinDetails<CSchema> = {
        type: criteriaToJoin.type,
        parameters: joinParameter,
        criteria: criteriaToJoin,
      };
      this._joins.set(criteriaToJoin.alias, joinDetails);
    }
    return this;
  }
}
