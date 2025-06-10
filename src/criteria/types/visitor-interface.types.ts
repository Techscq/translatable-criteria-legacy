import type { RootCriteria } from '../root.criteria.js';
import type { InnerJoinCriteria } from '../inner.join-criteria.js';
import type { LeftJoinCriteria } from '../left.join-criteria.js';
import type { OuterJoinCriteria } from '../outer.join-criteria.js';
import type { Filter } from '../filter/filter.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from './schema.types.js';
import type { PivotJoin, SimpleJoin } from './join-parameter.types.js';

/**
 * Visitor interface for traversing Criteria objects.
 * @template Context - The type of the context object passed during traversal.
 * @template Output - The type of the result returned by visitor methods.
 */
export interface ICriteriaVisitor<Context, Output = Context> {
  visitRoot<
    RootCSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCSchema>,
  >(
    criteria: RootCriteria<RootCSchema, RootAlias>,
    context: Context,
  ): Output | Promise<Output>;

  visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: Context,
  ): Output | Promise<Output>;

  visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: Context,
  ): Output | Promise<Output>;

  visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCSchema>,
  >(
    criteria: OuterJoinCriteria<JoinCSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCSchema, JoinRelationType>,
    context: Context,
  ): Output | Promise<Output>;

  visitFilter<FieldType extends string>(
    filter: Filter<FieldType>,
    context: Context,
  ): Output | Promise<Output>;

  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    context: Context,
  ): Output | Promise<Output>;

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    context: Context,
  ): Output | Promise<Output>;
}
