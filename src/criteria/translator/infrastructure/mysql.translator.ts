import { FilterGroup } from '../../filter/filter-group.js';
import { Filter } from '../../filter/filter.js';
import type { InnerJoinCriteria } from '../../inner.join-criteria.js';
import type { LeftJoinCriteria } from '../../left.join-criteria.js';
import type { OuterJoinCriteria } from '../../outer.join-criteria.js';
import type { RootCriteria } from '../../root.criteria.js';
import type {
  PivotJoin,
  SimpleJoin,
} from '../../types/join-parameter.types.js';
import type {
  CriteriaSchema,
  SelectedAliasOf,
  JoinRelationType,
} from '../../types/schema.types.js';
import { CriteriaTranslator } from '../criteria-translator.js';
import { FilterOperator } from '../../types/operator.types.js';
import type { Order } from '../../order/order.js';

export class MysqlTranslator extends CriteriaTranslator<string, string> {
  private params: unknown[] = [];
  private orderByClauses: string[] = [];

  public getParams(): unknown[] {
    const currentParams = [...this.params];
    this.params = [];
    return currentParams;
  }

  private escapePart(part: string): string {
    return `\`${part.replace(/`/g, '``')}\``;
  }

  private escapeField(field: string, alias?: string): string {
    const escapedField = this.escapePart(field);
    if (alias) {
      return `${this.escapePart(alias)}.${escapedField}`;
    }
    return escapedField;
  }

  private addParam(value: unknown): string {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '(NULL)';
      }
      const placeholders = value.map((val) => {
        this.params.push(val);
        return '?';
      });
      return `(${placeholders.join(', ')})`;
    }
    this.params.push(value);
    return '?';
  }

  private buildSelectClause<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
  ): string {
    const rootSelectedFieldsArray = criteria.select;
    let rootSelectionSQL: string;

    if (rootSelectedFieldsArray.length > 0) {
      rootSelectionSQL = rootSelectedFieldsArray
        .map((field) => this.escapeField(field as string, criteria.alias))
        .join(', ');
    } else {
      rootSelectionSQL = '*';
    }

    const allSelectedSQLParts: string[] = [rootSelectionSQL];

    for (const joinDetail of criteria.joins) {
      const joinSelectedFieldsArray = joinDetail.criteria.select;
      if (joinSelectedFieldsArray.length > 0) {
        const joinFieldsSQL = joinSelectedFieldsArray
          .map((field) =>
            this.escapeField(field as string, joinDetail.criteria.alias),
          )
          .join(', ');
        allSelectedSQLParts.push(joinFieldsSQL);
      }
    }

    const finalSelectString = allSelectedSQLParts.join(', ');

    return `SELECT ${finalSelectString}`;
  }

  private buildFromClause<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
  ): string {
    return ` FROM ${this.escapePart(criteria.sourceName)} AS ${this.escapePart(criteria.alias)}`;
  }

  private buildJoinClauses<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
  ): string {
    let joinClauses = '';
    for (const joinDetail of criteria.joins) {
      const joinClause = joinDetail.criteria.accept(
        this,
        joinDetail.parameters,
        '',
      );
      joinClauses += ` ${joinClause}`;
    }
    return joinClauses;
  }

  private buildWhereClause<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
  ): string {
    if (criteria.rootFilterGroup.items.length > 0) {
      const whereClause = criteria.rootFilterGroup.accept(
        this,
        criteria.alias,
        '',
      );
      if (whereClause) {
        return ` WHERE ${whereClause}`;
      }
    }
    return '';
  }

  private buildOrderByClause(): string {
    if (this.orderByClauses.length > 0) {
      return ` ORDER BY ${this.orderByClauses.join(', ')}`;
    }
    return '';
  }

  private buildLimitOffsetClause<RootCriteriaSchema extends CriteriaSchema>(
    criteria: RootCriteria<
      RootCriteriaSchema,
      SelectedAliasOf<RootCriteriaSchema>
    >,
  ): string {
    let clause = '';
    if (criteria.take > 0) {
      clause += ` LIMIT ${this.addParam(criteria.take)}`;
      if (criteria.skip > 0) {
        clause += ` OFFSET ${this.addParam(criteria.skip)}`;
      }
    } else if (criteria.skip > 0) {
      // MySQL doesnt support OFFSET without LIMIT.
    }
    return clause;
  }

  visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    _initialQueryContext: string,
  ): string {
    this.params = [];
    this.orderByClauses = [];
    let query = '';

    query += this.buildSelectClause(criteria);
    query += this.buildFromClause(criteria);

    this.calculateOrderByClauseForAlias(criteria.orders, criteria.alias);

    query += this.buildJoinClauses(criteria);
    query += this.buildWhereClause(criteria);
    query += this.buildOrderByClause();
    query += this.buildLimitOffsetClause(criteria);

    return query.trim() + ';';
  }

  private buildJoinClauseContent<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    joinType: 'INNER JOIN' | 'LEFT JOIN',
    criteria:
      | InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>
      | LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
  ): string {
    const joinAlias = criteria.alias;
    const joinTable = criteria.sourceName;
    let finalJoinClause = '';

    if ('pivot_source_name' in parameters) {
      const pivotTableSourceName = parameters.pivot_source_name;
      const pivotTableAlias = `${parameters.parent_alias}_${joinAlias}_pivot`;

      const parentToPivotOnCondition = `${this.escapeField(parameters.parent_field.reference as string, parameters.parent_alias)} = ${this.escapeField(parameters.parent_field.pivot_field, pivotTableAlias)}`;
      finalJoinClause = `${joinType} ${this.escapePart(pivotTableSourceName)} AS ${this.escapePart(pivotTableAlias)} ON ${parentToPivotOnCondition}`;

      const pivotToTargetOnCondition = `${this.escapeField(parameters.join_field.pivot_field, pivotTableAlias)} = ${this.escapeField(parameters.join_field.reference as string, joinAlias)}`;
      finalJoinClause += ` ${joinType} ${this.escapePart(joinTable)} AS ${this.escapePart(joinAlias)} ON ${pivotToTargetOnCondition}`;

      if (criteria.rootFilterGroup.items.length > 0) {
        const joinFilterClause = criteria.rootFilterGroup.accept(
          this,
          joinAlias,
          '',
        );
        if (joinFilterClause) {
          finalJoinClause += ` AND ${joinFilterClause}`;
        }
      }
    } else {
      const onCondition = `${this.escapeField(parameters.parent_field as string, parameters.parent_alias)} = ${this.escapeField(parameters.join_field as string, joinAlias)}`;
      finalJoinClause = `${joinType} ${this.escapePart(joinTable)} AS ${this.escapePart(joinAlias)} ON ${onCondition}`;

      if (criteria.rootFilterGroup.items.length > 0) {
        const joinFilterClause = criteria.rootFilterGroup.accept(
          this,
          joinAlias,
          '',
        );
        if (joinFilterClause) {
          finalJoinClause += ` AND ${joinFilterClause}`;
        }
      }
    }

    this.calculateOrderByClauseForAlias(criteria.orders, criteria.alias);
    return finalJoinClause;
  }

  visitInnerJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: InnerJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    _context: string,
  ): string {
    return this.buildJoinClauseContent('INNER JOIN', criteria, parameters);
  }

  visitLeftJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    criteria: LeftJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    _context: string,
  ): string {
    return this.buildJoinClauseContent('LEFT JOIN', criteria, parameters);
  }

  visitOuterJoin<
    ParentCSchema extends CriteriaSchema,
    JoinCriteriaSchema extends CriteriaSchema,
    JoinAlias extends SelectedAliasOf<JoinCriteriaSchema>,
  >(
    _criteria: OuterJoinCriteria<JoinCriteriaSchema, JoinAlias>,
    _parameters:
      | PivotJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>
      | SimpleJoin<ParentCSchema, JoinCriteriaSchema, JoinRelationType>,
    _context: string,
  ): string {
    throw new Error(
      'FULL OUTER JOIN translation is complex and not yet implemented for MySQL in this translator. ' +
        'It typically requires a UNION of a LEFT and a RIGHT JOIN, ' +
        'which needs a more holistic query construction approach.',
    );
  }

  override visitFilter<FieldType extends string>(
    filter: Filter<FieldType>,
    currentAlias: string,
    _queryContext: string,
  ): string {
    const fieldName = this.escapeField(filter.field, currentAlias);

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return `${fieldName} = ${this.addParam(filter.value)}`;
      case FilterOperator.NOT_EQUALS:
        return `${fieldName} != ${this.addParam(filter.value)}`;
      case FilterOperator.GREATER_THAN:
        return `${fieldName} > ${this.addParam(filter.value)}`;
      case FilterOperator.GREATER_THAN_OR_EQUALS:
        return `${fieldName} >= ${this.addParam(filter.value)}`;
      case FilterOperator.LESS_THAN:
        return `${fieldName} < ${this.addParam(filter.value)}`;
      case FilterOperator.LESS_THAN_OR_EQUALS:
        return `${fieldName} <= ${this.addParam(filter.value)}`;
      case FilterOperator.LIKE:
      case FilterOperator.CONTAINS:
        return `${fieldName} LIKE ${this.addParam(filter.value)}`;
      case FilterOperator.NOT_LIKE:
        return `${fieldName} NOT LIKE ${this.addParam(filter.value)}`;
      case FilterOperator.IN:
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          return '1=0';
        }
        return `${fieldName} IN ${this.addParam(filter.value)}`;
      case FilterOperator.NOT_IN:
        if (!Array.isArray(filter.value) || filter.value.length === 0) {
          return '1=1';
        }
        return `${fieldName} NOT IN ${this.addParam(filter.value)}`;
      case FilterOperator.IS_NULL:
        return `${fieldName} IS NULL`;
      case FilterOperator.IS_NOT_NULL:
        return `${fieldName} IS NOT NULL`;
      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }
  }

  private processGroupItems<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAliasForGroup: string,
    queryContext: string,
  ): string[] {
    const conditions = group.items.map((item) =>
      item.accept(this, currentAliasForGroup, queryContext),
    );
    return conditions.filter(
      (c): c is string => typeof c === 'string' && c.length > 0,
    );
  }

  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    queryContext: string,
  ): string {
    if (group.items.length === 0) return '';
    const conditions = this.processGroupItems(
      group,
      currentAlias,
      queryContext,
    );
    return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '';
  }

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    queryContext: string,
  ): string {
    if (group.items.length === 0) return '';
    const conditions = this.processGroupItems(
      group,
      currentAlias,
      queryContext,
    );
    return conditions.length > 0 ? `(${conditions.join(' OR ')})` : '';
  }

  private calculateOrderByClauseForAlias(
    orders: ReadonlyArray<Order>,
    alias: string,
  ): void {
    if (orders.length > 0) {
      this.orderByClauses = this.orderByClauses.concat(
        orders.map((order) => {
          return `${this.escapeField(order.field, alias)} ${order.direction}`;
        }),
      );
    }
  }
}
