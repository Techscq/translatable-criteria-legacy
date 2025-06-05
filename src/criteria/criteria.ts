import type { FilterPrimitive } from './filter/filter.js';
import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
} from './types/schema.types.js';
import { Order, OrderDirection } from './order/order.js';
import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import type {
  IFilterManager,
  IJoinManager,
} from './types/criteria-manager.types.js';
import type {
  ICriteriaBase,
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './types/criteria-common.types.js';
import { CriteriaType } from './types/criteria.types.js';

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
  private readonly _filterManager: IFilterManager<CSchema>;
  private readonly _joinManager: IJoinManager<CSchema>;
  private readonly _source_name: CSchema['source_name'];

  protected constructor(
    protected readonly _schema: CSchema,
    protected _alias: CurrentAlias,
    protected _criteriaType: TCriteriaType,
  ) {
    this._source_name = _schema.source_name;
    this._filterManager = new CriteriaFilterManager<CSchema>();
    this._joinManager = new CriteriaJoinManager<CSchema>();
  }

  private _take: number = 1;

  get take() {
    return this._take;
  }

  private _skip: number = 0;

  get skip() {
    return this._skip;
  }

  private _orders: Array<Order<string>> = [];

  get orders() {
    return this._orders;
  }

  get joins() {
    return this._joinManager.getJoins();
  }

  get type() {
    return this._criteriaType;
  }

  get rootFilterGroup() {
    return this._filterManager.getRootFilterGroup();
  }

  get sourceName() {
    return this._source_name;
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
  setTake(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    this._take = amount;
    return this;
  }
  setSkip(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    this._skip = amount;
    return this;
  }

  orderBy(
    field: FieldOfSchema<CSchema>,
    direction: OrderDirection,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._orders.push(new Order(direction, field));
    return this;
  }

  where(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.where(filterOrGroupPrimitive);
    return this;
  }

  andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.andWhere(filterOrGroupPrimitive);
    return this;
  }

  orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.orWhere(filterOrGroupPrimitive);
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
    this._joinManager.addJoin(criteriaToJoin, joinParameter);
    return this;
  }
}
