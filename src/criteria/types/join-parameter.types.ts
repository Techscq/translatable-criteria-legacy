import type {
  CriteriaSchema,
  FieldOfSchema,
  JoinRelationType,
} from './schema.types.js';

export type PivotJoin<
  ParentSchema extends CriteriaSchema,
  JoinSchema extends CriteriaSchema,
  TJoinRelationType extends JoinRelationType,
> = {
  parent_to_join_relation_type: TJoinRelationType;
  parent_source_name: ParentSchema['source_name'];
  parent_alias: ParentSchema['alias'][number];

  pivot_source_name: string;
  parent_field: {
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
  TJoinRelationType extends JoinRelationType,
> = {
  parent_to_join_relation_type: TJoinRelationType;
  parent_source_name: ParentSchema['source_name'];
  parent_alias: ParentSchema['alias'][number];
  parent_field: FieldOfSchema<ParentSchema>;
  join_field: FieldOfSchema<JoinSchema>;
};
