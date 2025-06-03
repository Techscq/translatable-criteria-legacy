# Repository Criteria Interface

This library provides an interface for implementing the Repository Pattern, with a strong focus on flexible data filtering using a dedicated `criteria` module.

## Overview

The goal of this library is to simplify data access within your application by providing a consistent and abstract way to interact with different data sources. The core concept revolves around the `criteria` module, which allows developers to define sophisticated filtering and relationship (joins) configurations in a data source-agnostic manner.

An adapter mechanism is in place to translate these `criteria` configurations into the specific query language or API calls required by the underlying data storage (e.g., SQL, NoSQL, ORM queries). This separation of concerns promotes cleaner code, improves testability, and makes it easier to switch or support multiple data sources.

## Key Features

* **Repository Pattern Interface:** Provides a clear contract for data access operations (e.g., `find`, `findOne`, `findAll`, `save`, `delete`).
* **Powerful Filtering with Criteria:** The central `criteria` module enables complex filtering based on entity properties and related data.
* **Join Configuration:** Define how related entities should be fetched (e.g., inner join, left join, eager loading).
* **Adapter-Based Architecture:** Easily integrate with various data sources by implementing specific adapters.
* **Data Source Agnostic:** The core library remains independent of the underlying data storage implementation.

## Getting Started (Conceptual)

While this is an initial stage, the general idea for using this library would involve:

1.  **Defining Entities:** Model your application's data structures.
2.  **Creating Repositories:** Implement repository interfaces for your entities, utilizing the provided base repository or interface.
3.  **Constructing Criteria:** Use the `criteria` module to build filtering and join configurations based on your requirements.
4.  **Using Repositories:** Call methods on your repository instances, passing in `criteria` objects to retrieve filtered and related data.
5.  **Implementing Adapters:** Develop adapters that translate the generic `criteria` into the specific language of your chosen data source.

## Example (Conceptual)

```javascript
// Assuming you have a UserRepository and a Criteria builder
import { UserRepository } from './repositories/user.repository';
import { CriteriaBuilder } from './criteria';

// Get all active users with their associated orders
const criteria = new CriteriaBuilder()
  .where('isActive', '=', true)
  .join('orders')
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .build();

userRepository.findAll(criteria)
  .then(usersWithOrders => {
    console.log(usersWithOrders);
  });