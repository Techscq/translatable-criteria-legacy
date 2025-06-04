import type { FilterGroup } from './filter-group.js';
import type { FilterPrimitive } from './filter.js';
import type {
  AliasOfSchema,
  CriteriaSchema,
  FieldOfSchema,
} from './schema.types.js';
import type {
  StoredJoinDetails,
  JoinParameterType,
  JoinCriteriaParameterType,
  SpecificMatchingJoinConfig,
} from './criteria-join.types.js';

export interface IFilterManager<CSchema extends CriteriaSchema> {
  where(filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void;
  andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): void;
  orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): void;
  getRootFilterGroup(): FilterGroup | undefined;
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
