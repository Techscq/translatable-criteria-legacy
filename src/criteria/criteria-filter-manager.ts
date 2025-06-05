import type { CriteriaSchema, FieldOfSchema } from './types/schema.types.js';
import { FilterGroup } from './filter/filter-group.js';
import type { FilterPrimitive } from './filter/filter.js';
import type { IFilterManager } from './types/criteria-manager.types.js';

export class CriteriaFilterManager<CSchema extends CriteriaSchema>
  implements IFilterManager<CSchema>
{
  private _rootFilterGroup?: FilterGroup;

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

  where(filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>): void {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'replace',
      filterOrGroupPrimitive,
    );
  }

  andWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): void {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'and',
      filterOrGroupPrimitive,
    );
  }

  orWhere(
    filterOrGroupPrimitive: FilterPrimitive<FieldOfSchema<CSchema>>,
  ): void {
    this._rootFilterGroup = this.getNewRootFilterGroup(
      'or',
      filterOrGroupPrimitive,
    );
  }

  getRootFilterGroup(): FilterGroup | undefined {
    return this._rootFilterGroup;
  }
}
