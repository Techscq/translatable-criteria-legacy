import { CriteriaFactory } from '../../../criteria-factory.js';
import {
  CommentSchema,
  DirectionSchema,
  PermissionSchema,
  PostSchema,
  UserSchema,
} from '../../../test/fake/fake.schema.js';
import { MysqlTranslator } from '../mysql.translator.js';
import { FilterOperator } from '../../../types/operator.types.js';
import { FilterGroup } from '../../../filter/filter-group.js';
import { OrderDirection } from '../../../order/order.js';

describe('MysqlTranslator', () => {
  let translator: MysqlTranslator;

  beforeEach(() => {
    translator = new MysqlTranslator();
  });

  describe('Core SELECT and FROM clause translation', () => {
    it('should translate a simple RootCriteria with selectAll by listing all schema fields', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts');
      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts`;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with specific select fields', () => {
      const criteria = CriteriaFactory.GetCriteria(
        UserSchema,
        'users',
      ).setSelect(['uuid', 'email']);
      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `users`.`uuid`, `users`.`email` FROM `user` AS `users`;',
      );
      expect(translator.getParams()).toEqual([]);
    });
  });

  describe('WHERE clause translation', () => {
    describe('Basic Filter Operators', () => {
      it('should translate RootCriteria with a simple EQUALS WHERE clause', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').where(
          {
            field: 'title',
            operator: FilterOperator.EQUALS,
            value: 'Test Title',
          },
        );
        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`title` = ?);',
        );
        expect(translator.getParams()).toEqual(['Test Title']);
      });

      it('should translate RootCriteria with IS NULL operator', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').where(
          {
            field: 'body',
            operator: FilterOperator.IS_NULL,
            value: null, // value is irrelevant for IS_NULL
          },
        );
        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`body` IS NULL);',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate RootCriteria with IN operator', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').where(
          {
            field: 'user_uuid',
            operator: FilterOperator.IN,
            value: ['user1', 'user2', 'user3'],
          },
        );
        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`user_uuid` IN (?, ?, ?));',
        );
        expect(translator.getParams()).toEqual(['user1', 'user2', 'user3']);
      });

      it('should handle IN operator with empty array returning 1=0 (false)', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').where(
          {
            field: 'user_uuid', // This field is part of a filter that evaluates to '1=0'
            operator: FilterOperator.IN,
            value: [],
          },
        );
        const query = translator.translate(criteria, '');
        // visitAndGroup (or visitOrGroup if it were a single OR) wraps it: (1=0)
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (1=0);',
        );
        expect(translator.getParams()).toEqual([]);
      });
    });

    describe('Logical Grouping (AND/OR)', () => {
      it('should translate RootCriteria with an AND WHERE clause', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
          .where({
            field: 'title',
            operator: FilterOperator.LIKE,
            value: '%Test%',
          })
          .andWhere({
            field: 'user_uuid',
            operator: FilterOperator.EQUALS,
            value: 'user123',
          });
        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`title` LIKE ? AND `posts`.`user_uuid` = ?);',
        );
        expect(translator.getParams()).toEqual(['%Test%', 'user123']);
      });

      it('should translate RootCriteria with an OR WHERE clause', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
          .where({
            field: 'title',
            operator: FilterOperator.EQUALS,
            value: 'Title A',
          })
          .orWhere({
            field: 'body',
            operator: FilterOperator.CONTAINS, // CONTAINS, translate to LIKE
            value: 'Content B',
          });
        const query = translator.translate(criteria, '');
        // Adjusted Expected: WHERE ((`posts`.`title` = ?) OR (`posts`.`body` LIKE ?))
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE ((`posts`.`title` = ?) OR (`posts`.`body` LIKE ?));',
        );
        expect(translator.getParams()).toEqual(['Title A', 'Content B']);
      });

      it('should handle complex nested AND/OR filters', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
          .where({
            field: 'title',
            operator: FilterOperator.EQUALS,
            value: 'A',
          })
          .andWhere({
            field: 'body',
            operator: FilterOperator.LIKE,
            value: 'B',
          })
          .orWhere({
            field: 'user_uuid',
            operator: FilterOperator.EQUALS,
            value: 'C',
          });

        const query = translator.translate(criteria, '');
        // Structure: OR( AND(A,B), AND(C) )
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE ((`posts`.`title` = ? AND `posts`.`body` LIKE ?) OR (`posts`.`user_uuid` = ?));',
        );
        expect(translator.getParams()).toEqual(['A', 'B', 'C']);
      });
    });

    describe('Edge Cases', () => {
      it('should produce an empty WHERE clause if rootFilterGroup is empty or results in no conditions', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts');
        (criteria as any)._filterManager._rootFilterGroup = new FilterGroup({
          items: [],
          logicalOperator: 'AND' as any,
        });

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts`;',
        );
        expect(translator.getParams()).toEqual([]);
      });
    });
  });

  describe('JOIN clause translation', () => {
    describe('INNER JOIN', () => {
      it('should translate a RootCriteria with a simple INNER JOIN selecting all join fields by default', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate an INNER JOIN with selected fields from the joined table', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetInnerJoinCriteria(
            UserSchema,
            'publisher',
          ).setSelect(['email', 'username']),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`email`, `publisher`.`username` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate an INNER JOIN with filters on the joined table', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').where({
            field: 'username',
            operator: FilterOperator.EQUALS,
            value: 'testuser',
          }),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`username` = ?);',
        );
        expect(translator.getParams()).toEqual(['testuser']);
      });

      it('should translate a RootCriteria with multiple INNER JOINs', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
          .join(CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'), {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          })
          .join(
            CriteriaFactory.GetInnerJoinCriteria(
              CommentSchema,
              'comments',
            ).where({
              field: 'comment_text',
              operator: FilterOperator.NOT_EQUALS,
              value: 'spam',
            }),
            { parent_field: 'uuid', join_field: 'post_uuid' },
          );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`post_uuid`, `comments`.`user_uuid`, `comments`.`comment_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` INNER JOIN `comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` AND (`comments`.`comment_text` != ?);',
        );
        expect(translator.getParams()).toEqual(['spam']);
      });
    });

    describe('LEFT JOIN', () => {
      it('should translate a RootCriteria with a simple LEFT JOIN selecting all join fields by default', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetLeftJoinCriteria(UserSchema, 'publisher'),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate a LEFT JOIN with selected fields from the joined table', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetLeftJoinCriteria(
            UserSchema,
            'publisher',
          ).setSelect(['email']),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`email` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate a LEFT JOIN with filters on the joined table (in ON clause)', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
          CriteriaFactory.GetLeftJoinCriteria(UserSchema, 'publisher').where({
            field: 'username',
            operator: FilterOperator.EQUALS,
            value: 'activeuser',
          }),
          {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          },
        );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`username` = ?);',
        );
        expect(translator.getParams()).toEqual(['activeuser']);
      });
    });

    describe('PivotJoin (Many-to-Many)', () => {
      it('should translate a RootCriteria with an INNER JOIN to a many-to-many related table (User to Permissions)', () => {
        const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users').join(
          CriteriaFactory.GetInnerJoinCriteria(PermissionSchema, 'permissions'),
          {
            pivot_source_name: 'user_permission_pivot_table',
            parent_field: {
              pivot_field: 'user_foreign_key',
              reference: 'uuid',
            },
            join_field: {
              pivot_field: 'permission_foreign_key',
              reference: 'uuid',
            },
          },
        );

        const query = translator.translate(criteria, '');
        const expectedPivotAlias = 'users_permissions_pivot';

        expect(query).toBe(
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`direction_uuid`, `permissions`.`uuid`, `permissions`.`name` ' +
            'FROM `user` AS `users` ' +
            `INNER JOIN \`user_permission_pivot_table\` AS \`${expectedPivotAlias}\` ON \`users\`.\`uuid\` = \`${expectedPivotAlias}\`.\`user_foreign_key\` ` +
            `INNER JOIN \`permission\` AS \`permissions\` ON \`${expectedPivotAlias}\`.\`permission_foreign_key\` = \`permissions\`.\`uuid\`;`,
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate a RootCriteria with a LEFT JOIN to a many-to-many related table with filters on the target', () => {
        const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users').join(
          CriteriaFactory.GetLeftJoinCriteria(
            PermissionSchema,
            'permissions',
          ).where({
            field: 'name',
            operator: FilterOperator.EQUALS,
            value: 'admin_role',
          }),
          {
            pivot_source_name: 'user_permission_pivot_table',
            parent_field: { pivot_field: 'user_fk', reference: 'uuid' },
            join_field: { pivot_field: 'permission_fk', reference: 'uuid' },
          },
        );

        const query = translator.translate(criteria, '');
        const expectedPivotAlias = 'users_permissions_pivot';

        expect(query).toBe(
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`direction_uuid`, `permissions`.`uuid`, `permissions`.`name` ' +
            'FROM `user` AS `users` ' +
            `LEFT JOIN \`user_permission_pivot_table\` AS \`${expectedPivotAlias}\` ON \`users\`.\`uuid\` = \`${expectedPivotAlias}\`.\`user_fk\` ` +
            `LEFT JOIN \`permission\` AS \`permissions\` ON \`${expectedPivotAlias}\`.\`permission_fk\` = \`permissions\`.\`uuid\` AND (\`permissions\`.\`name\` = ?);`,
        );
        expect(translator.getParams()).toEqual(['admin_role']);
      });
    });

    describe('Mixed JOIN types', () => {
      it('should translate multiple JOINs including LEFT JOIN and INNER JOIN', () => {
        const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
          .join(CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'), {
            parent_field: 'user_uuid',
            join_field: 'uuid',
          })
          .join(
            CriteriaFactory.GetLeftJoinCriteria(
              CommentSchema,
              'comments',
            ).where({
              field: 'comment_text',
              operator: FilterOperator.LIKE,
              value: '%review%',
            }),
            { parent_field: 'uuid', join_field: 'post_uuid' },
          );

        const query = translator.translate(criteria, '');
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`post_uuid`, `comments`.`user_uuid`, `comments`.`comment_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` LEFT JOIN `comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` AND (`comments`.`comment_text` LIKE ?);',
        );
        expect(translator.getParams()).toEqual(['%review%']);
      });

      it('should translate a RootCriteria with multiple joins including a PivotJoin and a SimpleJoin', () => {
        const criteria = CriteriaFactory.GetCriteria(UserSchema, 'users')
          .join(
            CriteriaFactory.GetInnerJoinCriteria(
              PermissionSchema,
              'permissions',
            ).setSelect(['name']),
            {
              pivot_source_name: 'user_permission_link',
              parent_field: {
                pivot_field: 'user_ref_in_pivot',
                reference: 'uuid',
              },
              join_field: {
                pivot_field: 'permission_ref_in_pivot',
                reference: 'uuid',
              },
            },
          )
          .join(
            CriteriaFactory.GetLeftJoinCriteria(
              DirectionSchema,
              'address',
            ).setSelect(['direction']),
            {
              parent_field: 'direction_uuid',
              join_field: 'uuid',
            },
          )
          .where({
            field: 'email',
            operator: FilterOperator.LIKE,
            value: '%@example.com',
          });

        const query = translator.translate(criteria, '');
        const pivotAliasForPermissions = 'users_permissions_pivot';

        expect(query).toBe(
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`direction_uuid`, `permissions`.`name`, `address`.`direction` ' +
            'FROM `user` AS `users` ' +
            `INNER JOIN \`user_permission_link\` AS \`${pivotAliasForPermissions}\` ON \`users\`.\`uuid\` = \`${pivotAliasForPermissions}\`.\`user_ref_in_pivot\` ` +
            `INNER JOIN \`permission\` AS \`permissions\` ON \`${pivotAliasForPermissions}\`.\`permission_ref_in_pivot\` = \`permissions\`.\`uuid\` ` +
            'LEFT JOIN `direction` AS `address` ON `users`.`direction_uuid` = `address`.`uuid` ' +
            'WHERE (`users`.`email` LIKE ?);',
        );
        expect(translator.getParams()).toEqual(['%@example.com']);
      });
    });
  });

  describe('ORDER BY clause translation', () => {
    it('should translate a RootCriteria with a single ORDER BY clause', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').orderBy(
        'title',
        OrderDirection.ASC,
      );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` ORDER BY `posts`.`title` ASC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with multiple ORDER BY clauses', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .orderBy('user_uuid', OrderDirection.DESC)
        .orderBy('title', OrderDirection.ASC);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` ORDER BY `posts`.`user_uuid` DESC, `posts`.`title` ASC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with JOIN and ORDER BY (ordering by root field)', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .join(CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher'), {
          parent_field: 'user_uuid',
          join_field: 'uuid',
        })
        .orderBy('title', OrderDirection.DESC);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` DESC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with INNER JOIN and ORDER BY a field from the JOINED table', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
        CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
          'username',
          OrderDirection.ASC,
        ),
        { parent_field: 'user_uuid', join_field: 'uuid' },
      );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `publisher`.`username` ASC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with LEFT JOIN and ORDER BY a field from the JOINED table', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').join(
        CriteriaFactory.GetLeftJoinCriteria(UserSchema, 'publisher').orderBy(
          'email',
          OrderDirection.DESC,
        ),
        { parent_field: 'user_uuid', join_field: 'uuid' },
      );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `publisher`.`email` DESC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with multiple ORDER BY clauses from ROOT and JOIN', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .orderBy('title', OrderDirection.ASC)
        .join(
          CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
            'username',
            OrderDirection.DESC,
          ),
          { parent_field: 'user_uuid', join_field: 'uuid' },
        );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with multiple JOINs and multiple ORDER BY clauses from different JOINs', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .orderBy('title', OrderDirection.ASC)
        .join(
          CriteriaFactory.GetInnerJoinCriteria(UserSchema, 'publisher').orderBy(
            'username',
            OrderDirection.DESC,
          ),
          { parent_field: 'user_uuid', join_field: 'uuid' },
        )
        .join(
          CriteriaFactory.GetLeftJoinCriteria(
            CommentSchema,
            'comments',
          ).orderBy('comment_text', OrderDirection.ASC),
          { parent_field: 'uuid', join_field: 'post_uuid' },
        );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`post_uuid`, `comments`.`user_uuid`, `comments`.`comment_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` LEFT JOIN `comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC, `comments`.`comment_text` ASC;',
      );
      expect(translator.getParams()).toEqual([]);
    });
  });

  describe('LIMIT and OFFSET clause translation', () => {
    it('should translate a RootCriteria with LIMIT (take) only', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts').setTake(
        10,
      );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` LIMIT ?;',
      );
      expect(translator.getParams()).toEqual([10]);
    });

    it('should translate a RootCriteria with LIMIT (take) and OFFSET (skip)', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .setTake(5)
        .setSkip(10);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` LIMIT ? OFFSET ?;',
      );
      expect(translator.getParams()).toEqual([5, 10]);
    });

    it('should NOT add LIMIT or OFFSET if take is 0, even if skip is set', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .setTake(0)
        .setSkip(5);

      const query = translator.translate(criteria, '');

      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts`;',
      );
      expect(translator.getParams()).toEqual([]);
    });
  });

  describe('Combined clause translation (Integration Tests)', () => {
    it('should translate a RootCriteria with WHERE and ORDER BY', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .where({
          field: 'body',
          operator: FilterOperator.CONTAINS,
          value: '%important%',
        })
        .orderBy('title', OrderDirection.ASC);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`body` LIKE ?) ORDER BY `posts`.`title` ASC;',
      );
      expect(translator.getParams()).toEqual(['%important%']);
    });

    it('should translate a RootCriteria with WHERE, ORDER BY, LIMIT and OFFSET', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .where({
          field: 'title',
          operator: FilterOperator.LIKE,
          value: '%SQL%',
        })
        .orderBy('title', OrderDirection.ASC)
        .setTake(10)
        .setSkip(20);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid` FROM `post` AS `posts` WHERE (`posts`.`title` LIKE ?) ORDER BY `posts`.`title` ASC LIMIT ? OFFSET ?;',
      );
      expect(translator.getParams()).toEqual(['%SQL%', 10, 20]);
    });

    it('should translate a RootCriteria with JOIN, ORDER BY, LIMIT and OFFSET', () => {
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

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`direction_uuid` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC LIMIT ? OFFSET ?;',
      );
      expect(translator.getParams()).toEqual([3, 6]);
    });
  });
});
