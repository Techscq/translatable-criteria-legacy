import type { FilterGroup } from '../filter/filter-group.js';
import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
} from './schema.types.js';
import type {
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
  StoredJoinDetails,
} from './criteria-common.types.js';
import type { FilterPrimitive } from '../filter/filter.types.base.js';

export interface IFilterManager<CSchema extends CriteriaSchema> {
  where(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  andWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  orWhere(filterPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  getRootFilterGroup(): FilterGroup;
}

export interface IJoinManager<CSchema extends CriteriaSchema> {
  addJoin<
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
  ): void;
  getJoins(): Array<[string, StoredJoinDetails<CSchema>]>;
}
