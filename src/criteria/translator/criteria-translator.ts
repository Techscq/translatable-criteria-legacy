import type { AliasOfSchema, CriteriaSchema } from '../types/schema.types.js';
import type { CriteriaType } from '../types/criteria.types.js';
import type { ICriteriaBase } from '../types/criteria-common.types.js';

export type onlyRootCriteriaType = Exclude<
  typeof CriteriaType.ROOT,
  (typeof CriteriaType.JOIN)[keyof typeof CriteriaType.JOIN]
>;

/**
 * Interface for translating criteria into various query formats
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
export interface CriteriaTranslator<
  Source,
  OutPut = Source,
  RootSchema extends CriteriaSchema = CriteriaSchema,
> {
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
      onlyRootCriteriaType
    >,
    source: Source,
  ): OutPut | Promise<OutPut>;
}
