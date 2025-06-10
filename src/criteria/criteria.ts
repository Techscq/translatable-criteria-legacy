import type {
  CriteriaSchema,
  FieldOfSchema,
  SelectedAliasOf,
} from './types/schema.types.js';

import { CriteriaFilterManager } from './criteria-filter-manager.js';
import { CriteriaJoinManager } from './criteria-join-manager.js';
import { Cursor } from './cursor.js';
import { Order, OrderDirection } from './order/order.js';
import type { FilterPrimitive } from './filter/types/filter-primitive.types.js';
import type { ICriteriaBase } from './types/criteria.interface.js';
import type {
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './types/join-utility.types.js';
import { FilterOperator } from './types/operator.types.js';

export abstract class Criteria<
  TSchema extends CriteriaSchema,
  CurrentAlias extends SelectedAliasOf<TSchema> = SelectedAliasOf<TSchema>,
> implements ICriteriaBase<TSchema, CurrentAlias>
{
  private readonly _filterManager = new CriteriaFilterManager<TSchema>();
  private readonly _joinManager = new CriteriaJoinManager<TSchema>();
  private readonly _source_name: TSchema['source_name'];
  private _take: number = 0; // 0 = no limit
  protected _select: Set<FieldOfSchema<TSchema>> = new Set([]);
  private _selectAll: boolean = true;
  protected _cursor: Cursor<FieldOfSchema<TSchema>> | undefined;

  constructor(
    protected readonly schema: TSchema,
    protected _alias: CurrentAlias,
  ) {
    this._source_name = schema.source_name;
  }
  get select() {
    if (this._selectAll) {
      return this.schema.fields as Array<FieldOfSchema<TSchema>>;
    }
    return Array.from(this._select);
  }

  selectAll() {
    this._selectAll = true;
    this._select.clear();
    return this;
  }

  setSelect(selectFields: Array<FieldOfSchema<TSchema>>) {
    selectFields.forEach((field) => {
      if (!this.schema.fields.includes(field))
        throw new Error(
          `The field '${field}' is not defined in the schema '${this.schema.source_name}'.`,
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

  get rootFilterGroup() {
    return this._filterManager.getRootFilterGroup();
  }

  get sourceName() {
    return this._source_name;
  }

  get alias() {
    return this._alias;
  }

  setTake(amount: number) {
    if (amount < 0) {
      throw new Error(`Take value cant be negative`);
    }
    this._take = amount;
    return this;
  }
  setSkip(amount: number) {
    if (amount < 0) {
      throw new Error(`Skip value cant be negative`);
    }
    this._skip = amount;
    return this;
  }

  orderBy(field: FieldOfSchema<TSchema>, direction: OrderDirection) {
    this._orders.push(new Order(direction, field));
    return this;
  }

  where(filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>) {
    this._filterManager.where(filterPrimitive);
    return this;
  }

  andWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>) {
    this._filterManager.andWhere(filterPrimitive);
    return this;
  }

  orWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>) {
    this._filterManager.orWhere(filterPrimitive);
    return this;
  }

  join<
    TJoinSchema extends CriteriaSchema,
    TJoinedCriteriaAlias extends SelectedAliasOf<TJoinSchema>,
    TMatchingJoinConfig extends SpecificMatchingJoinConfig<
      TSchema,
      TJoinedCriteriaAlias
    >,
  >(
    criteriaToJoin: JoinCriteriaParameterType<
      TSchema,
      TJoinSchema,
      TJoinedCriteriaAlias,
      TMatchingJoinConfig
    >,
    joinParameter: JoinParameterType<TSchema, TJoinSchema, TMatchingJoinConfig>,
  ) {
    if (
      typeof criteriaToJoin === 'object' &&
      typeof joinParameter === 'object'
    ) {
      const fullJoinParameters = {
        ...joinParameter,
        parent_alias: this.alias,
        parent_source_name: this.sourceName,
        parent_to_join_relation_type: this.schema.joins.find(
          (join) => join.alias === criteriaToJoin.alias,
        )!.join_relation_type,
      };
      this._joinManager.addJoin(criteriaToJoin, fullJoinParameters);
    }
    return this;
  }

  get cursor() {
    return this._cursor;
  }

  setCursor(
    cursorFilters: [
      Omit<FilterPrimitive<FieldOfSchema<TSchema>>, 'operator'>,
      Omit<FilterPrimitive<FieldOfSchema<TSchema>>, 'operator'>,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ) {
    if (cursorFilters.length !== 2)
      throw new Error(`The cursor must have exactly 2 elements`);

    cursorFilters.forEach((filterPrimitive) => {
      if (!this.schema.fields.includes(filterPrimitive.field))
        throw new Error(
          `The field '${filterPrimitive.field}' is not defined in the schema '${this.schema.source_name}'.`,
        );
    });
    this._cursor = new Cursor(cursorFilters, operator, order);
    return this;
  }
}
