import { GetTypedCriteriaSchema } from '../../types/schema.types.js';

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts'],
  fields: ['uuid', 'title', 'body', 'user_uuid'],
  joins: [
    { alias: 'comments', join_relation_type: 'one_to_many' },
    { alias: 'publisher', join_relation_type: 'many_to_one' },
  ],
});

export const CommentSchema = GetTypedCriteriaSchema({
  source_name: 'comment',
  alias: ['comments'],
  fields: ['uuid', 'comment_text', 'post_uuid', 'user_uuid', 'comment_uuid'],
  joins: [
    { alias: 'comments', join_relation_type: 'one_to_many' },
    { alias: 'user', join_relation_type: 'many_to_one' },
  ],
});

export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'publisher', 'user'],
  fields: ['uuid', 'email', 'username', 'direction_uuid'],
  joins: [
    {
      alias: 'permissions',
      join_relation_type: 'many_to_many',
    },
    {
      alias: 'address',
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'posts',
      join_relation_type: 'one_to_many',
    },
  ],
});

export const PermissionSchema = GetTypedCriteriaSchema({
  source_name: 'permission',
  alias: ['permissions'],
  fields: ['uuid', 'name'],
  joins: [
    {
      alias: 'users',
      join_relation_type: 'many_to_many',
    },
  ],
});

export const DirectionSchema = GetTypedCriteriaSchema({
  source_name: 'direction',
  alias: ['address'],
  fields: ['uuid', 'direction', 'user_uuid'],
  joins: [
    {
      alias: 'users',
      join_relation_type: 'many_to_one',
    },
  ],
});
/*
Criteria.Create(PostSchema, 'posts')
  .where({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  .join(
    Criteria.CreateInnerJoin(CommentSchema, 'comments').join(
      Criteria.CreateInnerJoin(UserSchema, 'users'),
      {
        parent_field: 'user_uuid',
        join_field: 'uuid',
      },
    ),
    {
      parent_field: 'uuid',
      join_field: 'post_uuid',
    },
  );

Criteria.Create(UserSchema, 'users')
  .where({
    field: 'email',
    operator: FilterOperator.EQUALS,
    value: 'contact@nelsoncabrera.dev',
  })
  .join(Criteria.CreateInnerJoin(PermissionSchema, 'permissions'), {
    join_source_name: 'permission_user',
    join_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
    parent_join_field: { pivot_field: 'user_uuid', reference: 'uuid' },
  });*/
