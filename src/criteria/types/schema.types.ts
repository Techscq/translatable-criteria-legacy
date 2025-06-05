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
