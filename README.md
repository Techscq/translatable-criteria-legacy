# Translatable Criteria

[![Development Stage](https://img.shields.io/badge/Development-Active%20Development-green)]()

A TypeScript library for building data-source agnostic, translatable query criteria. Define complex filtering, ordering, and join logic in a structured, type-safe way, then translate it to your specific data source using custom translators.

## Installation

**Note:** If you plan to use the included `TypeOrmMysqlTranslator`, ensure you have `typeorm` and your database driver (e.g., `mysql2`) installed in your project:

```bash
  npm install translatable-criteria
```

## Overview

This library simplifies the construction of complex data queries by providing a consistent and abstract way to define filtering, ordering, field selection, pagination (offset and cursor-based), and relationship (joins) configurations. The core concept revolves around the `Criteria` object hierarchy, which allows developers to define sophisticated query specifications in a data source-agnostic manner. These `Criteria` objects can then be processed by a `CriteriaTranslator` (using the Visitor pattern) to generate queries for various data sources.

## Key Features

- **Enhanced Type-Safety:** Construct queries with a fluent, strongly-typed interface, benefiting from compile-time and runtime validation of field names, aliases, and join parameters based on your schemas.
- **Powerful Filtering:** Define intricate filtering logic with multiple operators and grouping. Filter groups are automatically normalized for consistency.
- **Flexible Join System:** Support for various join types (inner, left, full outer) and pivot table configurations, with validation of join parameters according to the relation type.
- **Default Join Field Selection:** When a join is added, if `setSelect()` is not explicitly called on the `JoinCriteria`, all fields from the joined schema will be automatically included in the main `SELECT` clause. This can be overridden by using `setSelect()` on the specific `JoinCriteria`.
- **Field Selection:** Specify exactly which fields to retrieve using `setSelect()` or `selectAll()`.
- **Pagination:** Supports both offset-based (`setTake()`, `setSkip()`) and cursor-based (`setCursor()`) pagination.
- **Visitor Pattern for Translation:** Criteria objects implement an `accept` method, allowing for clean and extensible translation logic via the Visitor pattern.
- **Data Source Agnostic:** Design criteria independently of the underlying data source.
- **Translator-Based Architecture:** Implement custom `CriteriaTranslator` instances to convert criteria into specific query languages.
- **Functional Translators Provided:**
  - **`TypeOrmMysqlTranslator`:** A fully functional translator for generating TypeORM `SelectQueryBuilder` instances (specifically for MySQL). Ready for use in projects leveraging TypeORM.
  - **`MysqlTranslator`:** A translator for generating raw MySQL query strings and their corresponding parameters.
- **Integration Tested:** Key translator functionality is backed by integration tests using a real MySQL database in CI.
- **Full TypeScript Support:** Benefit from compile-time validation and autocompletion.

## Core Concepts

### CriteriaTranslator (Abstract Class)

The library provides an abstract `CriteriaTranslator` class that implements the `ICriteriaVisitor` interface. You (or the community) will extend this class to convert Criteria objects into queries for specific data sources (e.g., SQL, MongoDB queries).
Two functional examples are provided:

- `TypeOrmMysqlTranslator`: For generating TypeORM `SelectQueryBuilder` instances for MySQL.

  ##### Requirements:

  ```bash
    npm install mysql2 typeorm
  ```

- `MysqlTranslator`: For generating raw MySQL query strings.

### Criteria Hierarchy & Factory

The core logic is built around an abstract `Criteria` class, with concrete implementations like `RootCriteria`, `InnerJoinCriteria`, `LeftJoinCriteria`, and `OuterJoinCriteria`. It is **recommended** to use the `CriteriaFactory` to create `Criteria` instances (e.g., `CriteriaFactory.GetCriteria(...)`, `CriteriaFactory.GetInnerJoinCriteria(...)`) rather than instantiating them directly.

### Schemas

Schemas define the structure, available fields, and potential join relationships of your data entities. This enables type-safe criteria construction. Schemas are defined using the `GetTypedCriteriaSchema` helper to preserve literal types for enhanced type safety.

## Usage Example

```typescript
import { GetTypedCriteriaSchema } from 'translatable-criteria';
export const UserSchema = GetTypedCriteriaSchema({
  source_name: 'user',
  alias: ['users', 'user', 'publisher'],
  fields: ['uuid', 'email', 'username', 'created_at'],
  joins: [
    {
      alias: 'permissions',
      join_relation_type: 'many_to_many',
    },
    {
      alias: 'addresses',
      join_relation_type: 'one_to_many',
    },
    {
      alias: 'posts',
      join_relation_type: 'one_to_many',
    },
  ],
});

export const PostSchema = GetTypedCriteriaSchema({
  source_name: 'post',
  alias: ['posts', 'post'],
  fields: ['uuid', 'title', 'body', 'user_uuid', 'created_at'],
  joins: [
    { alias: 'comments', join_relation_type: 'one_to_many' },
    { alias: 'publisher', join_relation_type: 'many_to_one' },
  ],
});

export const PermissionSchema = GetTypedCriteriaSchema({
  source_name: 'permission',
  alias: ['permissions', 'permission'],
  fields: ['uuid', 'name', 'created_at'],
  joins: [
    {
      alias: 'users',
      join_relation_type: 'many_to_many',
    },
  ],
});

export const PostCommentSchema = GetTypedCriteriaSchema({
  source_name: 'post_comment',
  alias: ['comments', 'comment'],
  fields: ['uuid', 'comment_text', 'user_uuid', 'post_uuid', 'created_at'],
  joins: [
    { alias: 'post', join_relation_type: 'many_to_one' },
    { alias: 'user', join_relation_type: 'many_to_one' },
  ],
});

export const AddressSchema = GetTypedCriteriaSchema({
  source_name: 'address',
  alias: ['addresses', 'address'],
  fields: ['uuid', 'direction', 'user_uuid', 'created_at'],
  joins: [
    {
      alias: 'user',
      join_relation_type: 'many_to_one',
    },
  ],
});
```

### Criteria

Build type-safe query specifications using the `Criteria` class via `CriteriaFactory`.

## Usage

### Basic Example

```typescript
import { CriteriaFactory } from 'translatable-criteria';
import { UserSchema } from './path/to/your/criteria/schemas';
const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users');
```

### Complex nested AND/OR filters

```typescript
import { CriteriaFactory, FilterOperator } from 'translatable-criteria';
import { UserSchema } from './path/to/your/criteria/schemas';
CriteriaFactory.GetCriteria(UserSchema, 'users')
  .where({
    field: 'email',
    operator: FilterOperator.LIKE,
    value: '%@example.com%',
  })
  .andWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'user_1',
  })
  .orWhere({
    field: 'username',
    operator: FilterOperator.EQUALS,
    value: 'user_2',
  })
  .orWhere({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: 'some-uuid',
  });

/*TypeORM QueryBuilder SQL outut:
    `SELECT `users`.`uuid` AS `users_uuid`, `users`.`created_at` AS `users_created_at`, `users`.`email` AS `users_email`,
    `users`.`username` AS `users_username` FROM `user` `users` WHERE
    ((`users`.`email` LIKE ? AND `users`.`username` = ?) OR (`users`.`username` = ?) OR (`users`.`uuid` = ?))`
 */
```

### Advanced Joins Example with order and offset pagination

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from 'translatable-criteria';
import { PostSchema, UserSchema } from './path/to/your/criteria/schemas';
const pageSize = 10;
const currentPage = 2;
const skipAmount = (currentPage - 1) * pageSize;

const postsWithPublisherOrdered = CriteriaFactory.GetCriteria(
  PostSchema,
  'posts',
)
  .join(
    CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
      'username',
      OrderDirection.ASC,
    ), // Order by joined entity's field
    { parent_field: 'user_uuid', join_field: 'uuid' },
  )
  .orderBy('created_at', OrderDirection.DESC) // Then order by root entity's field
  .setTake(pageSize)
  .setSkip(skipAmount);
```

### Advanced Joins Example with cursor pagination

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
} from 'translatable-criteria';
import { UserSchema, UserSchema } from './path/to/your/criteria/schemas';
const lastUserFromPreviousPage = {
  created_at: '2023-01-01T10:00:00.000Z',
  uuid: 'some-previous-user-uuid',
};
const pageSizeForCursor = 5;

const usersByCursor = CriteriaFactory.GetCriteria(UserSchema, 'users')
  .setCursor(
    [
      { field: 'created_at', value: lastUserFromPreviousPage.created_at },
      { field: 'uuid', value: lastUserFromPreviousPage.uuid },
    ],
    FilterOperator.GREATER_THAN,
    OrderDirection.ASC,
  )
  .orderBy('created_at', OrderDirection.ASC)
  .orderBy('uuid', OrderDirection.ASC)
  .setTake(pageSizeForCursor);
```

### Many-to-Many Relationship Example

```typescript
import { CriteriaFactory } from 'translatable-criteria';
import { UserSchema, PermissionSchema } from './path/to/your/criteria/schemas';
const userCriteriaWithPermissions = CriteriaFactory.GetCriteria(
  UserSchema,
  'users',
).join(CriteriaFactory.GetInnerJoinCriteria(PermissionSchema, 'permissions'), {
  pivot_source_name: 'permission_user',
  parent_field: {
    pivot_field: 'user_uuid',
    reference: 'uuid',
  },
  join_field: {
    pivot_field: 'permission_uuid',
    reference: 'uuid',
  },
});
```

### Using the `TypeOrmMysqlTranslator` (Example)

This translator is functional and ready to be used in your TypeORM projects. While it has been extensively tested with integration tests, if you encounter any bugs or limitations, please report them so they can be addressed. If you manage to fix it yourself, contributions are welcome! 🍻🥳

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  TypeOrmMysqlTranslator,
} from 'translatable-criteria';
import { UserEntity } from './path/to/your/typeorm/entities/user.entity'; // Actual TypeORM entity
import { PermissionSchema, UserSchema } from './path/to/your/criteria/schemas'; // Your Criteria Schemas
import {
  initializeDataSource, // Your TypeORM DataSource initialization function
  DbDatasource, // Your initialized TypeORM DataSource instance
} from './path-to-your-datasource-config-or-class'; // Placeholder for DataSource

const targetUserId = 'some-specific-user-uuid'; // Example: ID of the user you want to fetch

await initializeDataSource(); // Ensure DataSource is initialized

const queryBuilder = DbDatasource.getRepository(
  UserEntity, // Use the actual TypeORM entity
).createQueryBuilder('users'); // Alias must match the root criteria alias

const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
  .where({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: targetUserId, // Use a defined variable
  })
  .join(CriteriaFactory.GetInnerJoinCriteria(PermissionSchema, 'permissions'), {
    pivot_source_name: 'permission_user', // Matches your TypeORM @JoinTable name
    parent_field: { pivot_field: 'user_uuid', reference: 'uuid' },
    join_field: {
      pivot_field: 'permission_uuid',
      reference: 'uuid',
    },
  });

const translator = new TypeOrmMysqlTranslator<UserEntity>(); // Specify root entity type
translator.translate(criteria, queryBuilder);
//const fetchedUsers = await queryBuilder.getMany();
//console.log(queryBuilder.getSql(), queryBuilder.getParameters());
/*TYPEORM QueryBuilder SQL output (example):
 * SELECT `users`.`uuid` AS `users_uuid`, `users`.`created_at` AS `users_created_at`,
 * `users`.`email` AS `users_email`, `users`.`username` AS `users_username`, `permissions`.`uuid` AS `permissions_uuid`,
 *  `permissions`.`created_at` AS `permissions_created_at`, `permissions`.`name` AS `permissions_name`
 *  FROM `user` `users` INNER JOIN `permission_user` `users_permissions` ON `users_permissions`.`user_uuid`=`users`.`uuid`
 *  INNER JOIN `permission` `permissions` ON `permissions`.`uuid`=`users_permissions`.`permission_uuid` WHERE (`users`.`uuid` = ?)
 */
```

### Using the `MysqlTranslator` (Raw SQL Example)

This translator generates a MySQL query string and an array of parameters.

```typescript
import {
  CriteriaFactory,
  FilterOperator,
  OrderDirection,
  MysqlTranslator,
} from 'translatable-criteria';
import { UserSchema, UserSchema } from './path/to/your/criteria/schemas';
const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
  .join(
    CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
      'username',
      OrderDirection.DESC,
    ),
    { parent_field: 'user_uuid', join_field: 'uuid' },
  )
  .orderBy('title', OrderDirection.ASC)
  .setTake(3)
  .setSkip(6);

const translator = new MysqlTranslator();
const query = translator.translate(criteria, '');
//console.log(query, translator.getParams());
/*
 * SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`,
 *  `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts`
 *  INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` ASC,
 *  `publisher`.`username` DESC LIMIT ? OFFSET ?;
 * [ 3, 6 ]
 */
```

## Type Safety Features

- Compile-time validation of field names within criteria based on schemas.
- Type-checked join configurations ensuring compatibility between schemas.
- Autocomplete support for schema fields and defined join aliases.
- Validation of alias usage in `Criteria` constructors.
- Robust validation of join parameters based on `join_relation_type` (simple string fields vs. pivot objects with `pivot_field` and `reference`).
- Validation for selected fields, cursor fields, take/skip values.

## Roadmap

- [x] Implement cursor pagination ability.
- [x] Implement field selection (`select`).
- [x] Implement `ORDER BY` for root and joined criteria.
- [x] Implement `LIMIT` and `OFFSET` (take/skip) for pagination.
- [x] Implement `PivotJoin` for many-to-many relationships in translators.
- [x] Provide a fully functional translator for TypeORM (MySQL).
- [x] Provide a functional translator for raw MySQL.
- [x] Add integration tests for the TypeORM translator.
- [ ] Implement `OuterJoin` (Full Outer Join) in translators (e.g., for TypeORM if supported, or other SQL dialects).
- [ ] Enhance documentation with more detailed examples for translator development.
- [ ] Explore utility functions to simplify translator development.
- [ ] Add more comprehensive unit test coverage for criteria construction and edge cases.

## Contributing

This project is in active development. Contributions are welcome! Please feel free to submit a Pull Request on our GitHub repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Nelson Cabrera (@Techscq)
