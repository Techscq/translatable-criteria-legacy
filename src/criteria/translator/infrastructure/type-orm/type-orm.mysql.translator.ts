import { Brackets, type ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { CriteriaTranslator } from '../../criteria-translator.js';
import type {
  CriteriaSchema,
  JoinRelationType,
  SelectedAliasOf,
} from '../../../types/schema.types.js';
import type { RootCriteria } from '../../../root.criteria.js';
import {
  FilterOperator,
  LogicalOperator,
} from '../../../types/operator.types.js';
import { Filter } from '../../../filter/filter.js';
import { FilterGroup } from '../../../filter/filter-group.js';
import type { InnerJoinCriteria } from '../../../inner.join-criteria.js';
import type { LeftJoinCriteria } from '../../../left.join-criteria.js';
import type { OuterJoinCriteria } from '../../../outer.join-criteria.js';
import type {
  PivotJoin,
  SimpleJoin,
} from '../../../types/join-parameter.types.js';
import type { IFilterExpression } from '../../../types/filter-expression.interface.js';
import type { Cursor } from '../../../cursor.js';
import type { ICriteriaBase } from '../../../types/criteria.interface.js';

type TypeOrmConditionFragment = {
  queryFragment: string;
  parameters: {
    [p: string]: any;
  };
};

export class TypeOrmMysqlTranslator<
  T extends ObjectLiteral,
> extends CriteriaTranslator<
  SelectQueryBuilder<T>,
  SelectQueryBuilder<T>,
  TypeOrmConditionFragment
> {
  private paramCounter = 0;
  private generateParamName(): string {
    return `param_${this.paramCounter++}`;
  }

  visitFilter<FieldType extends string>(
    filter: Filter<FieldType>,
    currentAlias: string,
  ): TypeOrmConditionFragment {
    const fieldName = `${currentAlias}.${String(filter.field)}`;
    const paramName = this.generateParamName();
    let queryFragment = '';
    const parameters: ObjectLiteral = {};

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        queryFragment = `${fieldName} = :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.NOT_EQUALS:
        queryFragment = `${fieldName} != :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.GREATER_THAN:
        queryFragment = `${fieldName} > :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.GREATER_THAN_OR_EQUALS:
        queryFragment = `${fieldName} >= :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.LESS_THAN:
        queryFragment = `${fieldName} < :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.LESS_THAN_OR_EQUALS:
        queryFragment = `${fieldName} <= :${paramName}`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.LIKE:
      case FilterOperator.CONTAINS:
        queryFragment = `${fieldName} LIKE :${paramName}`;
        parameters[paramName] = `${filter.value}`;
        break;
      case FilterOperator.NOT_LIKE:
      case FilterOperator.NOT_CONTAINS:
        queryFragment = `${fieldName} NOT LIKE :${paramName}`;
        parameters[paramName] = `${filter.value}`;
        break;
      case FilterOperator.IN:
        queryFragment = `${fieldName} IN (:...${paramName})`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.NOT_IN:
        queryFragment = `${fieldName} NOT IN (:...${paramName})`;
        parameters[paramName] = filter.value;
        break;
      case FilterOperator.IS_NULL:
        queryFragment = `${fieldName} IS NULL`;
        break;
      case FilterOperator.IS_NOT_NULL:
        queryFragment = `${fieldName} IS NOT NULL`;
        break;
      default:
        throw new Error(`Unsupported operator: ${filter.operator}`);
    }
    return { queryFragment, parameters };
  }

  private buildCursorCondition<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(cursor: Cursor<any>, alias: RootAlias): TypeOrmConditionFragment {
    const [fieldPrimitive1, fieldPrimitive2] = cursor.filters.map((filter) =>
      filter.toPrimitive(),
    );
    const op =
      fieldPrimitive1!.operator === FilterOperator.GREATER_THAN ? '>' : '<';

    const paramName1 = this.generateParamName();
    const paramName2 = this.generateParamName();

    const parameters: ObjectLiteral = {};
    parameters[paramName1] = fieldPrimitive1!.value;
    parameters[paramName2] = fieldPrimitive2!.value;

    const field1Name = `${alias}.${String(fieldPrimitive1!.field)}`;
    const field2Name = `${alias}.${String(fieldPrimitive2!.field)}`;

    const queryFragment = `((${field1Name} ${op} :${paramName1}) OR (${field1Name} = :${paramName1} AND ${field2Name} ${op} :${paramName2}))`;

    return { queryFragment, parameters };
  }

  private resolveSelects<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(criteria: ICriteriaBase<RootCriteriaSchema, RootAlias>) {
    if (criteria.select.length > 0 && !criteria.selectAll) {
      criteria.orders.forEach((order) =>
        this.selects.add(`${criteria.alias}.${String(order.field)}`),
      );
      criteria.select.forEach((field) =>
        this.selects.add(`${criteria.alias}.${String(field)}`),
      );
    } else {
      this.selects.add(criteria.alias);
    }
  }

  private selects: Set<string> = new Set<string>([]);
  visitRoot<
    RootCriteriaSchema extends CriteriaSchema,
    RootAlias extends SelectedAliasOf<RootCriteriaSchema>,
  >(
    criteria: RootCriteria<RootCriteriaSchema, RootAlias>,
    qb: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    this.paramCounter = 0;
    this.selects = new Set<string>([]);
    this.resolveSelects(criteria);

    let mainWhereClauseApplied = false;

    if (criteria.rootFilterGroup.items.length > 0) {
      qb.where(
        new Brackets((bracketQb) => {
          criteria.rootFilterGroup.accept(this, criteria.alias, bracketQb);
        }),
      );
      mainWhereClauseApplied = true;
    }

    if (criteria.cursor) {
      const cursorCondition = this.buildCursorCondition(
        criteria.cursor,
        criteria.alias,
      );
      if (mainWhereClauseApplied) {
        qb.andWhere(
          new Brackets((bracketQb) => {
            bracketQb.where(
              cursorCondition.queryFragment,
              cursorCondition.parameters,
            );
          }),
        );
      } else {
        qb.where(
          new Brackets((bracketQb) => {
            bracketQb.where(
              cursorCondition.queryFragment,
              cursorCondition.parameters,
            );
          }),
        );
      }
    }

    criteria.orders.forEach((order, index) => {
      const orderField = `${criteria.alias}.${String(order.field)}`;
      if (index === 0 && !criteria.cursor) {
        qb.orderBy(orderField, order.direction);
      } else {
        qb.addOrderBy(orderField, order.direction);
      }
    });

    if (criteria.take > 0) {
      qb.take(criteria.take);
    }
    if (criteria.skip > 0) {
      qb.skip(criteria.skip);
    }

    for (const joinDetail of criteria.joins) {
      joinDetail.criteria.accept(this, joinDetail.parameters, qb);
    }

    return qb.select(Array.from(this.selects.values()));
  }

  private applyConditionToQueryBuilder(
    qb: SelectQueryBuilder<T>,
    conditionOrBracket: string | Brackets,
    isFirstInThisBracket: boolean,
    logicalConnector: LogicalOperator,
    parameters?: ObjectLiteral,
  ): void {
    if (isFirstInThisBracket) {
      qb.where(conditionOrBracket, parameters);
    } else if (logicalConnector === LogicalOperator.AND) {
      qb.andWhere(conditionOrBracket, parameters);
    } else {
      qb.orWhere(conditionOrBracket, parameters);
    }
  }

  private processGroupItems(
    items: ReadonlyArray<IFilterExpression>,
    currentAlias: string,
    qb: SelectQueryBuilder<T>,
    groupLogicalOperator: LogicalOperator,
  ): void {
    items.forEach((item, index) => {
      const isFirstItemInThisBracketCallback = index === 0;
      if (item instanceof Filter) {
        const { queryFragment, parameters } = item.accept(this, currentAlias);
        this.applyConditionToQueryBuilder(
          qb,
          queryFragment,
          isFirstItemInThisBracketCallback,
          groupLogicalOperator,
          parameters,
        );
      } else if (item instanceof FilterGroup) {
        const nestedBracket = new Brackets((subQb) => {
          item.accept(this, currentAlias, subQb);
        });
        this.applyConditionToQueryBuilder(
          qb,
          nestedBracket,
          isFirstItemInThisBracketCallback,
          groupLogicalOperator,
        );
      }
    });
  }

  visitAndGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    qb: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    this.processGroupItems(group.items, currentAlias, qb, LogicalOperator.AND);
    return qb;
  }

  visitOrGroup<FieldType extends string>(
    group: FilterGroup<FieldType>,
    currentAlias: string,
    qb: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    this.processGroupItems(group.items, currentAlias, qb, LogicalOperator.OR);
    return qb;
  }

  private buildOnConditionFromFilterGroup(
    group: FilterGroup<any>,
    aliasForGroupItems: string,
  ): { conditionString: string; parameters: ObjectLiteral } | undefined {
    if (group.items.length === 0) {
      return undefined;
    }
    const conditions: string[] = [];
    const allParams: ObjectLiteral = {};
    const processItemRecursive = (
      item: IFilterExpression,
    ): string | undefined => {
      if (item instanceof Filter) {
        const { queryFragment, parameters } = this.visitFilter(
          item,
          aliasForGroupItems,
        );
        Object.assign(allParams, parameters);
        return queryFragment;
      } else if (item instanceof FilterGroup) {
        const subConditions: string[] = [];
        item.items.forEach((subItem) => {
          const subConditionPart = processItemRecursive(subItem);
          if (subConditionPart) subConditions.push(subConditionPart);
        });
        if (subConditions.length === 0) return undefined;
        return `(${subConditions.join(item.type === 'AND' ? ' AND ' : ' OR ')})`;
      }
      return undefined;
    };
    group.items.forEach((item) => {
      const conditionPart = processItemRecursive(item);
      if (conditionPart) conditions.push(conditionPart);
    });
    if (conditions.length === 0) return undefined;
    return {
      conditionString: conditions.join(group.type === 'AND' ? ' AND ' : ' OR '),
      parameters: allParams,
    };
  }

  private applyJoinLogic(
    qb: SelectQueryBuilder<T>,
    joinType: 'inner' | 'left',
    criteria: InnerJoinCriteria<any, any> | LeftJoinCriteria<any, any>,
    parameters:
      | PivotJoin<CriteriaSchema, CriteriaSchema, JoinRelationType>
      | SimpleJoin<CriteriaSchema, CriteriaSchema, JoinRelationType>,
  ): SelectQueryBuilder<T> {
    const joinAlias = criteria.alias;
    const targetTableNameOrRelationProperty = `${parameters.parent_alias}.${criteria.alias}`;
    let onConditionClause: string | undefined = undefined;
    let onConditionParams: ObjectLiteral = {};

    if (criteria.rootFilterGroup.items.length > 0) {
      const onConditionResult = this.buildOnConditionFromFilterGroup(
        criteria.rootFilterGroup,
        joinAlias,
      );
      if (onConditionResult) {
        onConditionClause = onConditionResult.conditionString;
        onConditionParams = onConditionResult.parameters;
      }
    }

    const baseJoinAndSelectMethod =
      joinType === 'inner' ? qb.innerJoinAndSelect : qb.leftJoinAndSelect;

    baseJoinAndSelectMethod.call(
      qb,
      targetTableNameOrRelationProperty,
      joinAlias,
      onConditionClause,
      onConditionParams,
    );

    this.resolveSelects(criteria);

    criteria.orders.forEach((order) => {
      qb.addOrderBy(`${joinAlias}.${String(order.field)}`, order.direction);
    });

    return qb;
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
    qb: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    return this.applyJoinLogic(qb, 'inner', criteria, parameters);
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
    qb: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    return this.applyJoinLogic(qb, 'left', criteria, parameters);
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
    _context: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    throw new Error(
      'OuterJoin (FULL OUTER JOIN) is not generically implemented for TypeOrmMysqlTranslator. ' +
        'Specific database support (e.g., PostgreSQL) would be required.',
    );
  }
}
