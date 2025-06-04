import type { AliasOfSchema, CriteriaSchema } from './schema.types.js';
import type { IJoinManager } from './criteria-manager.types.js';
import type {
  JoinCriteriaParameterType,
  JoinParameterType,
  SpecificMatchingJoinConfig,
  StoredJoinDetails,
} from './criteria-join.types.js';
import type { ICriteriaBase } from './criteria-common.types.js';
import { CriteriaType } from './criteria.types.js';

function isICriteria<
  JoinSchema extends CriteriaSchema,
  JoinedCriteriaAlias extends AliasOfSchema<JoinSchema>,
>(
  value: unknown,
): value is ICriteriaBase<
  JoinSchema,
  JoinedCriteriaAlias,
  Exclude<
    (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN],
    typeof CriteriaType.ROOT
  >
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'alias' in value
  );
}

export class CriteriaJoinManager<CSchema extends CriteriaSchema>
  implements IJoinManager<CSchema>
{
  private _joins: Map<string, StoredJoinDetails<CSchema>> = new Map();

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
  ): void {
    if (isICriteria<JoinSchema, JoinedCriteriaAlias>(criteriaToJoin)) {
      const joinDetails: StoredJoinDetails<CSchema> = {
        type: criteriaToJoin.type,
        parameters: joinParameter,
        criteria: criteriaToJoin,
      };
      this._joins.set(criteriaToJoin.alias, joinDetails);
    }
  }

  getJoins(): Array<[string, StoredJoinDetails<CSchema>]> {
    return Array.from(this._joins.entries());
  }
}
