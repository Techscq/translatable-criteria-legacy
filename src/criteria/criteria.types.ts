import type {
  CriteriaSchema,
  FieldOfSchema,
  AliasOfSchema,
  SchemaJoins,
} from './schema.types.js';
export type { CriteriaSchema, FieldOfSchema, AliasOfSchema, SchemaJoins };
import type { PivotJoin, SimpleJoin } from './join.types.js';
export type { PivotJoin, SimpleJoin };
export { FilterOperator, LogicalOperator } from './operators.types.js';

export const CriteriaType = {
  ROOT: 'ROOT',
  JOIN: {
    INNER_JOIN: 'INNER_JOIN',
    LEFT_JOIN: 'LEFT_JOIN',
    FULL_OUTER: 'FULL_OUTER',
  },
} as const;

export type CriteriaType<CTypes = typeof CriteriaType> = {
  [Type in keyof CTypes]: CTypes[Type] extends string
    ? CTypes[Type]
    : CTypes[Type] extends object
      ? CriteriaType<CTypes[Type]>
      : never;
}[keyof CTypes];
