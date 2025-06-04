# Repository Criteria Interface

[![Development Stage](https://img.shields.io/badge/Development-Early%20Stage-yellow)]()

A TypeScript library providing an interface for the Repository Pattern with powerful data filtering and join capabilities using a criteria module and adapter-based architecture.

## Installation

```bash
  npm install repository-criteria-interface
```

## Overview

This library simplifies data access within your application by providing a consistent and abstract way to interact with different data sources. The core concept revolves around the `criteria` module, which allows developers to define sophisticated filtering and relationship (joins) configurations in a data source-agnostic manner.

## Key Features

- **Type-Safe Repository Pattern:** Provides a strongly-typed contract for data access operations
- **Powerful Filtering:** Build complex queries with a fluent criteria interface
- **Flexible Join System:** Support for various join types and pivot tables
- **Data Source Agnostic:** Works with any data source through adapters
- **Full TypeScript Support:** Compile-time validation and autocomplete

## Core Concepts

### Schemas

Schemas define the structure and relationships of your data entities:

```typescript
export const UserSchema = {
  source_name: 'user',
  alias: ['users', 'publisher'],
  fields: ['uuid', 'email', 'username'],
  joins: [
    { alias: 'permissions', with_pivot: true },
    { alias: 'addresses', with_pivot: false },
  ],
} as const;
```

### Criteria

Build type-safe queries using the criteria module:

```typescript
import { Criteria, FilterOperator } from 'repository-criteria-interface';
const criteria = Criteria.Create(UserSchema, 'users')
  .where({
    field: 'email',
    operator: FilterOperator.EQUALS,
    value: 'contact@nelsoncabrera.dev',
  })
  .join(Criteria.CreateInnerJoin(PermissionSchema, 'permissions'), {
    join_source_name: 'permission_user',
    join_field: { pivot_field: 'permission_uuid', reference: 'uuid' },
    parent_join_field: { pivot_field: 'user_uuid', reference: 'uuid' },
  });
```

## Usage

### Basic Example

```typescript
import { Criteria, FilterOperator } from 'repository-criteria-interface';
import { PostRepository } from './repositories/post.repository';
// Define your schema
const PostSchema = {
  source_name: 'post',
  alias: ['posts'],
  fields: ['uuid', 'title', 'body'],
  joins: [
    { alias: 'comments', with_pivot: false },
    { alias: 'publisher', with_pivot: false },
  ],
} as const;
// Create criteria with filtering
const criteria = Criteria.Create(PostSchema, 'posts').where({
  field: 'uuid',
  operator: FilterOperator.EQUALS,
  value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
});
// Use repository to fetch data
const post = await PostRepository.matchingOne(criteria);
```

### Advanced Joins Example

```typescript
// Define related schemas
const CommentSchema = {
  source_name: 'comment',
  alias: ['comments'],
  fields: ['uuid', 'comment_text'],
  joins: [{ alias: 'user', with_pivot: false }],
} as const;
// Create criteria with nested joins
const criteriaWithJoins = Criteria.Create(PostSchema, 'posts')
  .where({
    field: 'uuid',
    operator: FilterOperator.EQUALS,
    value: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  .join(
    Criteria.CreateInnerJoin(CommentSchema, 'comments').join(
      Criteria.CreateInnerJoin(UserSchema, 'user'),
      { parent_field: 'uuid', join_field: 'uuid' },
    ),
    { parent_field: 'uuid', join_field: 'uuid' },
  );
// Fetch post with comments and their users
const postWithComments = await PostRepository.matchingOne(criteriaWithJoins);
```

### Many-to-Many Relationship Example

```typescript
// Example with pivot table (many-to-many relationship)
const userCriteria = Criteria.Create(UserSchema, 'users')
  .where({
    field: 'email',
    operator: FilterOperator.EQUALS,
    value: 'contact@nelsoncabrera.dev',
  })
  .join(Criteria.CreateInnerJoin(PermissionSchema, 'permissions'), {
    join_source_name: 'permission_user', // pivot table name
    join_field: {
      pivot_field: 'permission_uuid',
      reference: 'uuid',
    },
    parent_join_field: {
      pivot_field: 'user_uuid',
      reference: 'uuid',
    },
  });

const userWithPermissions = await UserRepository.matchingOne(userCriteria);
```

## Type Safety Features

- Compile-time validation of field names
- Type-checked join configurations
- Autocomplete support for schema fields and relationships
- Validation of join compatibility between entities

## Roadmap

- [ ] Add common repository method implementations
- [ ] Implement database adapters (MySQL, PostgreSQL, MongoDB)
- [ ] Implement ORM adapters (TypeORM, Prisma, Sequelize)
- [ ] Add more complex filtering capabilities
- [ ] Implement pagination support
- [ ] Add more comprehensive test coverage

## Contributing

This project is in early development. Contributions are welcome! Please feel free to submit a Pull Request on our [GitHub repository](https://github.com/Techscq/repository-criteria-interface).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Nelson Cabrera ([@Techscq](https://github.com/Techscq))
