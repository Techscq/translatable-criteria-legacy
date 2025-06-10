import type {
  CriteriaSchema,
  FieldOfSchema,
  SelectedAliasOf,
} from './schema.types.js';
import type { FilterGroup } from '../filter/filter-group.js';

import type { Cursor } from '../cursor.js';
import type { Order, OrderDirection } from '../order/order.js';
import { FilterOperator } from './operator.types.js';
import type {
  StoredJoinDetails,
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
} from './join-utility.types.js';
import type { FilterPrimitive } from '../filter/types/filter-primitive.types.js';

export interface ICriteriaBase<
  TSchema extends CriteriaSchema,
  CurrentAlias extends SelectedAliasOf<TSchema>,
> {
  selectAll(): ICriteriaBase<TSchema, CurrentAlias>;
  setCursor(
    filterPrimitive: [
      Omit<FilterPrimitive<FieldOfSchema<TSchema>>, 'operator'>,
      Omit<FilterPrimitive<FieldOfSchema<TSchema>>, 'operator'>,
    ],
    operator: FilterOperator.GREATER_THAN | FilterOperator.LESS_THAN,
    order: OrderDirection,
  ): ICriteriaBase<TSchema, CurrentAlias>;
  get cursor(): Cursor<FieldOfSchema<TSchema>> | undefined;
  setSelect(
    selectFields: Array<FieldOfSchema<TSchema>>,
  ): ICriteriaBase<TSchema, CurrentAlias>;
  get select(): Array<FieldOfSchema<TSchema>>;
  orderBy(
    field: FieldOfSchema<TSchema>,
    direction: OrderDirection,
  ): ICriteriaBase<TSchema, CurrentAlias>;
  setTake(amount: number): ICriteriaBase<TSchema, CurrentAlias>;
  setSkip(amount: number): ICriteriaBase<TSchema, CurrentAlias>;
  get joins(): ReadonlyArray<StoredJoinDetails<TSchema>>;
  get rootFilterGroup(): FilterGroup;
  get alias(): CurrentAlias;
  get sourceName(): TSchema['source_name'];
  get take(): number;
  get skip(): number;
  get orders(): readonly Order[];
  where(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>,
  ): ICriteriaBase<TSchema, CurrentAlias>;
  andWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>,
  ): ICriteriaBase<TSchema, CurrentAlias>;
  orWhere(
    filterPrimitive: FilterPrimitive<FieldOfSchema<TSchema>>,
  ): ICriteriaBase<TSchema, CurrentAlias>;
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
  ): ICriteriaBase<TSchema, CurrentAlias>;
}
