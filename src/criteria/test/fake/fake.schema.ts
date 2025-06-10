import { GetTypedCriteriaSchema } from '../../types/schema.types.js';
import { CriteriaFactory } from '../../criteria-factory.js';
import { FilterOperator } from '../../types/operator.types.js';

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
  alias: ['permissions', 'permissions2'],
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

// Criteria.Create(PostSchema, 'posts')
//   .where({
//     field: 'title',
//     operator: FilterOperator.LIKE,
//     value: 'New NPM Package Released',
//   })
//   .join(
//     Criteria.CreateInnerJoin(CommentSchema, 'comments').join(
//       Criteria.CreateInnerJoin(UserSchema, 'user'),
//       {
//         parent_to_join_relation_type: 'many_to_one',
//         parent_field: 'uuid',
//         join_field: 'uuid',
//       },
//     ),
//     {
//       parent_to_join_relation_type: 'one_to_many',
//       parent_field: 'uuid',
//       join_field: 'uuid',
//     },
//   )
//   .orderBy('uuid', 'ASC')
//   .setSkip(10)
//   .setTake(3)
//   .setSelect(['uuid', 'body', 'user_uuid'])
//   .setCursor(
//     [
//       { value: '', field: 'uuid' },
//       { value: '', field: 'uuid' },
//     ],
//     FilterOperator.LESS_THAN,
//     'ASC',
//   );
const field = {
  field: 'uuid',
  value: '',
  operator: FilterOperator.IS_NOT_NULL,
} as const;
const permission = CriteriaFactory.GetInnerJoinCriteria(
  PermissionSchema,
  'permissions',
);
permission.where(field);
CriteriaFactory.GetCriteria(UserSchema, 'user').join(permission, {
  join_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
  parent_field: { pivot_field: 'user_uuid', reference: 'uuid' },
  pivot_source_name: 'sadasd',
});
/*Criteria.CreateInnerJoin(UserSchema, 'user');
Criteria.Create(PostSchema, 'posts').join(
  Criteria.CreateLeftJoin(UserSchema, 'publisher'),
  {
    join_field: 'uuid',
    parent_field: 'user_uuid',
    parent_to_join_relation_type: 'many_to_one',
  },
);

Criteria.Create(PostSchema, 'posts').join(
  Criteria.CreateLeftJoin(UserSchema, 'publisher'),
  {
    join_field: 'uuid',
    parent_field: 'user_uuid',
    parent_to_join_relation_type: 'many_to_one',
  },
);*/
