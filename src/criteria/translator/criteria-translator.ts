import type { AliasOfSchema, CriteriaSchema } from '../types/schema.types.js';
import type { CriteriaType } from '../types/criteria.types.js';
import type {
  ICriteriaBase,
  ICriteriaVisitor,
} from '../types/criteria-common.types.js';

export type onlyRootCriteriaType = Exclude<
  typeof CriteriaType.ROOT,
  (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN]
>;

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
export abstract class CriteriaTranslator<
  Source,
  Output = Source,
  RootSchema extends CriteriaSchema = CriteriaSchema,
> implements ICriteriaVisitor<Source, Output>
{
  /**
   * Translates a criteria into the target source format
   * @param criteria - The criteria to translate
   * @param source - The source object to translate into (e.g., QueryBuilder instance)
   * @returns The modified source or the output format if specified
   */
  translate(
    criteria: ICriteriaBase<
      RootSchema,
      AliasOfSchema<RootSchema>,
      typeof CriteriaType.ROOT
    >,
    source: Source,
  ): Output | Promise<Output> {
    return criteria.accept(this, source);
  }

  abstract visitRoot(
    criteria: ICriteriaBase<CriteriaSchema, string, typeof CriteriaType.ROOT>,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitInnerJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.INNER_JOIN
    >,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitLeftJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.LEFT_JOIN
    >,
    context: Source,
  ): Output | Promise<Output>;

  abstract visitFullOuterJoin(
    criteria: ICriteriaBase<
      CriteriaSchema,
      string,
      typeof CriteriaType.JOIN.FULL_OUTER
    >,
    context: Source,
  ): Output | Promise<Output>;
}
