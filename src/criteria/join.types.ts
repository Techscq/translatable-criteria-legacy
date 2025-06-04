import type { CriteriaSchema, FieldOfSchema } from './schema.types.js';

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
