export enum FilterOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUALS = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUALS = '<=',
  LIKE = 'LIKE',
  NOT_LIKE = 'NOT LIKE',
  IN = 'IN',
  NOT_IN = 'NOT IN',
  IS_NULL = 'IS NULL',
  IS_NOT_NULL = 'IS NOT NULL',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  NOT_CONTAINS = 'NOT_CONTAINS',
}

export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
}
