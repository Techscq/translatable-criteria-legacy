export const PostSchema = {
  source_name: 'post',
  alias: ['posts'],
  fields: ['uuid', 'title', 'body', 'user_uuid'],
  joins: [
    { alias: 'comments', with_pivot: false },
    { alias: 'publisher', with_pivot: false },
  ],
} as const;

export const CommentSchema = {
  source_name: 'comment',
  alias: ['comments'],
  fields: ['uuid', 'comment_text', 'post_uuid', 'user_uuid', 'comment_uuid'],
  joins: [
    { alias: 'comments', with_pivot: false },
    { alias: 'users', with_pivot: false },
  ],
} as const;

export const UserSchema = {
  source_name: 'user',
  alias: ['users', 'publisher'],
  fields: ['uuid', 'email', 'username', 'direction_uuid'],
  joins: [
    {
      alias: 'permissions',
      with_pivot: true,
    },
    {
      alias: 'address',
      with_pivot: false,
    },
    {
      alias: 'posts',
      with_pivot: false,
    },
  ],
} as const;

export const PermissionSchema = {
  source_name: 'permission',
  alias: ['permissions'],
  fields: ['uuid', 'name'],
  joins: [
    {
      alias: 'users',
      with_pivot: true,
    },
  ],
} as const;

export const DirectionSchema = {
  source_name: 'direction',
  alias: ['address'],
  fields: ['uuid', 'direction', 'user_uuid'],
  joins: [
    {
      alias: 'users',
      with_pivot: false,
    },
  ],
} as const;
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
