import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from '../types/schema.types.js';
import type { RootCriteria } from '../root.criteria.js';
import type { PivotJoin, SimpleJoin } from '../types/join-parameter.types.js';
import type { FilterGroup } from '../filter/filter-group.js';
import type { InnerJoinCriteria } from '../inner.join-criteria.js';
import type { LeftJoinCriteria } from '../left.join-criteria.js';
import type { OuterJoinCriteria } from '../outer.join-criteria.js';
import type { Filter } from '../filter/filter.js';
import type { ICriteriaVisitor } from '../types/visitor-interface.types.js';

/**
 * Abstract Class for translating criteria into various query formats
 * @template Source - The target format (e.g., QueryBuilder, raw SQL string, etc.)
 * @template OutPut - The output format by default its Source (Only specify this if
 * you really need something like a memory translator and the output would be different
 * from the Source itself)
 * @template RootSchema - The schema type for the root criteria
 * @example
 * // TypeORM QueryBuilder translator
 * class TypeORMTranslator implements CriteriaTranslator<SelectQueryBuilder<Entity>> {
 *   translate(criteria, queryBuilder) { return queryBuilder; }
 * }
 *
 * // Raw SQL translator
 * class SQLTranslator implements CriteriaTranslator<string> {
 *   translate(criteria, sql) { return sql; }
 * }
 */
export abstract class CriteriaTranslator<Source, Output = Source>
  implements ICriteriaVisitor<Source, Output>
{
  /**
   * Translates a criteria into the target source format
   * @param criteria - The criteria to translate
   * @param source - The source object to translate into (e.g., QueryBuilder instance)
   * @returns The modified source or the output format if specified
   */
  translate<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
    source: Source,
  ): Output | Promise<Output> {
    return criteria.accept(this, source);
  }

  abstract visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitFilter<FieldType extends string>(
    filter: Filter<FieldType>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    context: Source,
  ): Output | Promise<Output>;
}
