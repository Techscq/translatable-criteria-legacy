export type SchemaJoins<ValidAlias extends string> = {
  alias: ValidAlias;
  join_relation_type: JoinRelationType;
};

export type JoinRelationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

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

export function GetTypedCriteriaSchema<const TInput extends CriteriaSchema>(
  schema: TInput,
): TInput {
  return schema;
}
export type FieldOfSchema<T extends CriteriaSchema> =
  T['fields'] extends ReadonlyArray<string> ? T['fields'][number] : never;

export type SelectedAliasOf<T extends CriteriaSchema> =
  T['alias'] extends ReadonlyArray<string> ? T['alias'][number] : never;
