import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
} from './types/schema.types.js';
import { Order, OrderDirection } from './order/order.js';
import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import type {
  ICriteriaBase,
  ICriteriaVisitor,
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './types/criteria-common.types.js';
import { CriteriaType, FilterOperator } from './types/criteria.types.js';
import type { FilterPrimitive } from './filter/filter.types.base.js';
import { Cursor } from './cursor.js';

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
  private readonly _filterManager = new CriteriaFilterManager<CSchema>();
  private readonly _joinManager = new CriteriaJoinManager<CSchema>();
  private readonly _source_name: CSchema['source_name'];
  private _take: number = 0; // 0 = no limit
  protected _select: Set<FieldOfSchema<CSchema>> = new Set([]);
  private _selectAll: boolean = true;

  protected constructor(
    protected readonly _schema: CSchema,
    protected _alias: CurrentAlias,
    protected _criteriaType: TCriteriaType,
  ) {
    this._source_name = _schema.source_name;
  }

  get select(): Array<FieldOfSchema<CSchema>> {
    if (this._selectAll) {
      return this._schema.fields as Array<FieldOfSchema<CSchema>>;
    }
    return Array.from(this._select);
  }

  selectAll(): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    this._selectAll = true;
    this._select.clear();
    return this;
  }

  setSelect(
    selectFields: Array<FieldOfSchema<CSchema>>,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    selectFields.forEach((field) => {
      if (!this._schema.fields.includes(field))
        throw new Error(
          `The field '${field}' is not defined in the schema '${this._schema.source_name}'.`,
        );
    });
    this._selectAll = false;
    this._select = new Set(selectFields);
    return this;
  }

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
    if (amount < 0) {
      throw new Error(`Take value cant be negative`);
    }
    this._take = amount;
    return this;
  }
  setSkip(amount: number): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    if (amount < 0) {
      throw new Error(`Skip value cant be negative`);
    }
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
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.where(filterPrimitive);
    return this;
  }

  andWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.andWhere(filterPrimitive);
    return this;
  }

  orWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): Criteria<CSchema, CurrentAlias, TCriteriaType> {
    this._filterManager.orWhere(filterPrimitive);
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
  accept<Context, Result>(
    visitor: ICriteriaVisitor<Context, Result>,
    context: Context,
  ): Result | Promise<Result> {
    switch (this._criteriaType) {
      case CriteriaType.ROOT:
        return visitor.visitRoot(this as any, context);
      case CriteriaType.JOIN.INNER_JOIN:
        return visitor.visitInnerJoin(this as any, context);
      case CriteriaType.JOIN.LEFT_JOIN:
        return visitor.visitLeftJoin(this as any, context);
      case CriteriaType.JOIN.FULL_OUTER:
        return visitor.visitFullOuterJoin(this as any, context);
    }
  }
  protected _cursor: Cursor<FieldOfSchema<CSchema>> | undefined;
  get cursor() {
    return this._cursor;
  }

  setCursor(
    cursorFilters: [
      Omit<FilterPrimitive<FieldOfSchema<CSchema>>, 'operator'>,
      Omit<FilterPrimitive<FieldOfSchema<CSchema>>, 'operator'>,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ): ICriteriaBase<CSchema, CurrentAlias, TCriteriaType> {
    if (cursorFilters.length !== 2)
      throw new Error(`The cursor must have exactly 2 elements`);

    cursorFilters.forEach((filterPrimitive) => {
      if (!this._schema.fields.includes(filterPrimitive.field))
        throw new Error(
          `The field '${filterPrimitive.field}' is not defined in the schema '${this._schema.source_name}'.`,
        );
    });
    this._cursor = new Cursor(cursorFilters, operator, order);
    return this;
  }
}
