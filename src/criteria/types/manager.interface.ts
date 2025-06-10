import type { FilterGroup } from '../filter/filter-group.js';
import type {
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
  SelectedAliasOf,
} from './schema.types.js';

import type { FilterPrimitive } from '../filter/types/filter-primitive.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';
import type {
  AnyJoinCriteria,
  StoredJoinDetails,
} from './join-utility.types.js';

export interface IFilterManager<CSchema extends CriteriaSchema> {
  where(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  andWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  orWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  getRootFilterGroup(): FilterGroup;
}

export interface IJoinManager<CSchema extends CriteriaSchema> {
  addJoin<JoinSchema extends CriteriaSchema>(
    criteriaToJoin: AnyJoinCriteria<JoinSchema, SelectedAliasOf<JoinSchema>>,
    joinParameter:
      | PivotJoin<CSchema, JoinSchema, JoinRelationType>
      | SimpleJoin<CSchema, JoinSchema, JoinRelationType>,
  ): void;
  getJoins(): Array<StoredJoinDetails<CSchema>>;
}
