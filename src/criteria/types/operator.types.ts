/**
 * Enumerates the available filter operators for comparing field values.
 */
export enum FilterOperator {
  /** Checks for equality. */
  EQUALS = '=',
  /** Checks for inequality. */
  NOT_EQUALS = '!=',
  /** Checks if a value is greater than another. */
  GREATER_THAN = '>',
  /** Checks if a value is greater than or equal to another. */
  GREATER_THAN_OR_EQUALS = '>=',
  /** Checks if a value is less than another. */
  LESS_THAN = '<',
  /** Checks if a value is less than or equal to another. */
  LESS_THAN_OR_EQUALS = '<=',
  /** Checks if a string value matches a pattern (often case-sensitive, depends on DB). */
  LIKE = 'LIKE',
  /** Checks if a string value does not match a pattern. */
  NOT_LIKE = 'NOT LIKE',
  /** Checks if a value is within a set of specified values. */
  IN = 'IN',
  /** Checks if a value is not within a set of specified values. */
  NOT_IN = 'NOT IN',
  /** Checks if a value is NULL. */
  IS_NULL = 'IS NULL',
  /** Checks if a value is NOT NULL. */
  IS_NOT_NULL = 'IS NOT NULL',
  /** Checks if a string value contains a specific substring (often case-insensitive, depends on DB). */
  CONTAINS = 'CONTAINS',
  /** Checks if a string value starts with a specific substring. */
  STARTS_WITH = 'STARTS_WITH',
  /** Checks if a string value ends with a specific substring. */
  ENDS_WITH = 'ENDS_WITH',
  /** Checks if a string value does not contain a specific substring. */
  NOT_CONTAINS = 'NOT_CONTAINS',
}

/**
 * Enumerates the logical operators used to combine filter conditions or groups.
 */
export enum LogicalOperator {
  /** Combines conditions with a logical AND. All conditions must be true. */
  AND = 'AND',
  /** Combines conditions with a logical OR. At least one condition must be true. */
  OR = 'OR',
}
