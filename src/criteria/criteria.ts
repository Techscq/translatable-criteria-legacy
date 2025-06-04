import type { FilterPrimitive } from './filter.js';
import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
} from './schema.types.js';
import { Order } from './order.js';
import type {
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './criteria-join.types.js';
import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import type { IFilterManager, IJoinManager } from './criteria-manager.types.js';
import type { ICriteriaBase } from './criteria-common.types.js';
import { CriteriaType } from './criteria.types.js';

export class Criteria<
  CSchema extends CriteriaSchema,
  CurrentAlias extends AliasOfSchema<CSchema> = AliasOfSchema<CSchema>,
  TCriteriaType extends
    | typeof CriteriaType.ROOT
    | (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN] =
    | typeof CriteriaType.ROOT
    | (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
> implements ICriteriaBase<CSchema, CurrentAlias, TCriteriaType>
{
  private readonly filterManager: IFilterManager<CSchema>;
  private readonly joinManager: IJoinManager<CSchema>;
  private readonly _take: number = 1;
  private readonly _skip: number = 0;
  private readonly _orders: ReadonlyArray<Order<string>> = [];

  protected constructor(
    protected readonly _schema: CSchema,
    protected _alias: CurrentAlias,
    protected _criteriaType: TCriteriaType,
  ) {
    this.filterManager = new CriteriaFilterManager<CSchema>();
    this.joinManager = new CriteriaJoinManager<CSchema>();
  }

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
    return this.filterManager.getRootFilterGroup();
  }

  get joins() {
    return this.joinManager.getJoins();
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

  where(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this.filterManager.where(filterOrGroupPrimitive);
    return this;
  }

  andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this.filterManager.andWhere(filterOrGroupPrimitive);
    return this;
  }

  orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this.filterManager.orWhere(filterOrGroupPrimitive);
    return this;
  }

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
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this.joinManager.addJoin(criteriaToJoin, joinParameter);
    return this;
  }
}
