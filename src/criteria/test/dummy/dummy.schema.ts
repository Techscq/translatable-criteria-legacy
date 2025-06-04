import { Criteria } from '../../criteria.js';
import { FilterOperator } from '../../criteria.types.js';

export const BSchema = {
  source_name: 'post',
  alias: ['posts'],
  fields: ['uuid', 'title', 'body'],
  joins: [
    { alias: 'comments', with_pivot: false },
    { alias: 'publisher', with_pivot: false },
  ],
} as const;

export const ASchema = {
  source_name: 'comment',
  alias: ['comments'],
  fields: ['uuid', 'comment_text'],
  joins: [
    { alias: 'comments', with_pivot: false },
    { alias: 'users', with_pivot: false },
  ],
} as const;

export const CSchema = {
  source_name: 'user',
  alias: ['users', 'publisher'],
  fields: ['uuid', 'email', 'username'],
  joins: [
    {
      alias: 'permissions',
      with_pivot: true,
    },
    {
      alias: 'address',
      with_pivot: false,
    },
  ],
} as const;

export const DSchema = {
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

export const FSchema = {
  source_name: 'directions',
  alias: ['address', 'address2'],
  fields: ['uuid', 'direction'],
  joins: [
    {
      alias: 'users',
      with_pivot: false,
    },
  ],
} as const;

Criteria.Create(BSchema, 'posts')
  .where({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: 'asd',
  })
  .join(
    Criteria.CreateInnerJoin(CSchema, 'publisher').join(
      Criteria.CreateInnerJoin(DSchema, 'permissions'),
      {
        join_source_name: 'permission_user',
        join_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
        parent_join_field: { pivot_field: 'user_uuid', reference: 'uuid' },
      },
    ),
    {
      parent_field: 'uuid',
      join_field: 'uuid',
    },
  )
  .join(Criteria.CreateInnerJoin(ASchema, 'comments'), {
    parent_field: 'uuid',
    join_field: 'uuid',
  });
