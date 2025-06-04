export type SchemaJoins<ValidAlias extends string> = {
  alias: ValidAlias;
  with_pivot: true | false;
};

export type CriteriaSchema<
  TFields extends ReadonlyArray<string> = ReadonlyArray<string>,
  TAliases extends ReadonlyArray<string> = ReadonlyArray<string>,
  TSourceName extends string = string,
  JoinsAlias extends string = string,
> = {
  source_name: TSourceName;
  alias: TAliases;
  fields: TFields;
  joins: ReadonlyArray<SchemaJoins<JoinsAlias>>;
};

export type FieldOfSchema<T extends CriteriaSchema> =
  T['fields'] extends ReadonlyArray<string> ? T['fields'][number] : never;

export type AliasOfSchema<T extends CriteriaSchema> =
  T['alias'] extends ReadonlyArray<string> ? T['alias'][number] : never;

export type PivotJoin<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  join_source_name: string;
  parent_join_field: {
    pivot_field: string;
    reference: FieldOfSchema<ParentSchema>;
  };
  join_field: {
    pivot_field: string;
    reference: FieldOfSchema<JoinSchema>;
  };
};

export type SimpleJoin<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
> = {
  parent_field: FieldOfSchema<ParentSchema>;
  join_field: FieldOfSchema<JoinSchema>;
};

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
