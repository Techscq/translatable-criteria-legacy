import { CriteriaFactory } from '../../../../criteria-factory.js';
import { MysqlTranslator } from '../mysql.translator.js';
import { FilterOperator } from '../../../../types/operator.types.js';
import { FilterGroup } from '../../../../filter/filter-group.js';
import { OrderDirection } from '../../../../order/order.js';
import {
  AddressSchema,
  PermissionSchema,
  PostCommentSchema,
  PostSchema,
  UserSchema,
} from '../../test/fake/fake-entities.js';

function setupBasicPostUserJoin(joinType: 'inner' | 'left' = 'inner') {
  const rootAlias = PostSchema.alias[0]!;
  const joinAlias = 'publisher';
  const rootCriteria = CriteriaFactory.GetCriteria(PostSchema, rootAlias);
  const joinCriteria =
    joinType === 'inner'
      ? CriteriaFactory.GetInnerJoinCriteria(UserSchema, joinAlias)
      : CriteriaFactory.GetLeftJoinCriteria(UserSchema, joinAlias);
  const joinParams = { parent_field: 'user_uuid', join_field: 'uuid' } as const;
  return { rootCriteria, joinCriteria, joinParams, rootAlias, joinAlias };
}

describe('MysqlTranslator', async () => {
  let translator: MysqlTranslator;
  beforeEach(() => {
    translator = new MysqlTranslator();
  });

  describe('Core SELECT and FROM clause translation', () => {
    it('should translate a simple RootCriteria with selectAll by listing all schema fields', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts');
      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts`;',
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
      it.each([
        {
          op: FilterOperator.EQUALS,
          value: 'Test',
          field: 'title',
          expectedSqlFragment: '`posts`.`title` = ?',
          expectedParams: ['Test'],
        } as const,
        {
          op: FilterOperator.IS_NULL,
          value: null,
          field: 'body',
          expectedSqlFragment: '`posts`.`body` IS NULL',
          expectedParams: [],
        } as const,
        {
          op: FilterOperator.IN,
          value: ['user1', 'user2', 'user3'],
          field: 'user_uuid' as const,
          expectedSqlFragment: '`posts`.`user_uuid` IN (?, ?, ?)',
          expectedParams: ['user1', 'user2', 'user3'],
        },
        {
          op: FilterOperator.IN,
          value: [],
          field: 'user_uuid' as const,
          expectedSqlFragment: '1=0',
          expectedParams: [],
        },
      ])(
        'should translate $op operator with $value',
        ({ op, value, field, expectedSqlFragment, expectedParams }) => {
          const criteria = CriteriaFactory.GetCriteria(
            PostSchema,
            'posts',
          ).where({ field: field, operator: op, value: value });
          const query = translator.translate(criteria, '');
          expect(query).toContain(`WHERE (${expectedSqlFragment})`);
          expect(translator.getParams()).toEqual(expectedParams);
        },
      );
    });

    describe('Logical Grouping (AND/OR)', () => {
      it('should translate RootCriteria with an AND WHERE clause', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria
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
        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` WHERE (`posts`.`title` LIKE ? AND `posts`.`user_uuid` = ?);',
        );
        expect(translator.getParams()).toEqual(['%Test%', 'user123']);
      });

      it('should translate RootCriteria with an OR WHERE clause', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria
          .where({
            field: 'title',
            operator: FilterOperator.EQUALS,
            value: 'Title A',
          })
          .orWhere({
            field: 'body',
            operator: FilterOperator.CONTAINS,
            value: 'Content B',
          });
        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` WHERE ((`posts`.`title` = ?) OR (`posts`.`body` LIKE ?));',
        );
        expect(translator.getParams()).toEqual(['Title A', 'Content B']);
      });

      it('should handle complex nested AND/OR filters', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria
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

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );

        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` WHERE ((`posts`.`title` = ? AND `posts`.`body` LIKE ?) OR (`posts`.`user_uuid` = ?));',
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
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts`;',
        );
        expect(translator.getParams()).toEqual([]);
      });
    });
  });

  describe('JOIN clause translation', () => {
    describe('INNER JOIN', () => {
      it('should translate a RootCriteria with a simple INNER JOIN selecting all join fields by default', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria,
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate an INNER JOIN with selected fields from the joined table', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria.setSelect(['email', 'username']),
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`email`, `publisher`.`username` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate an INNER JOIN with filters on the joined table', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria.where({
            field: 'username',
            operator: FilterOperator.EQUALS,
            value: 'testuser',
          }),
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`username` = ?);',
        );
        expect(translator.getParams()).toEqual(['testuser']);
      });

      it('should translate a RootCriteria with multiple INNER JOINs', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin();
        basicSetupPostUserJoin.rootCriteria
          .join(
            basicSetupPostUserJoin.joinCriteria,
            basicSetupPostUserJoin.joinParams,
          )
          .join(
            CriteriaFactory.GetInnerJoinCriteria(
              PostCommentSchema,
              'comments',
            ).where({
              field: 'comment_text',
              operator: FilterOperator.NOT_EQUALS,
              value: 'spam',
            }),
            { parent_field: 'uuid', join_field: 'post_uuid' },
          );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`user_uuid`, `comments`.`post_uuid`, `comments`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` INNER JOIN `post_comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` AND (`comments`.`comment_text` != ?);',
        );
        expect(translator.getParams()).toEqual(['spam']);
      });
    });

    describe('LEFT JOIN', () => {
      it('should translate a RootCriteria with a simple LEFT JOIN selecting all join fields by default', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin('left');
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria,
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate a LEFT JOIN with selected fields from the joined table', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin('left');
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria.setSelect(['email']),
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`email` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid`;',
        );
        expect(translator.getParams()).toEqual([]);
      });

      it('should translate a LEFT JOIN with filters on the joined table (in ON clause)', () => {
        const basicSetupPostUserJoin = setupBasicPostUserJoin('left');
        basicSetupPostUserJoin.rootCriteria.join(
          basicSetupPostUserJoin.joinCriteria.where({
            field: 'username',
            operator: FilterOperator.EQUALS,
            value: 'activeuser',
          }),
          basicSetupPostUserJoin.joinParams,
        );

        const query = translator.translate(
          basicSetupPostUserJoin.rootCriteria,
          '',
        );
        expect(query).toBe(
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` AND (`publisher`.`username` = ?);',
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
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`created_at`, `permissions`.`uuid`,' +
            ` \`permissions\`.\`name\`, \`permissions\`.\`created_at\` FROM \`user\` AS \`users\` INNER JOIN \`user_permission_pivot_table\`` +
            ` AS \`${expectedPivotAlias}\` ON \`users\`.\`uuid\` = \`${expectedPivotAlias}\`.\`user_foreign_key\` INNER JOIN \`permission\`` +
            ` AS \`permissions\` ON \`${expectedPivotAlias}\`.\`permission_foreign_key\` = \`permissions\`.\`uuid\`;`,
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
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`created_at`, `permissions`.`uuid`, `permissions`.`name`, `permissions`.`created_at` ' +
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
              PostCommentSchema,
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
          'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`user_uuid`, `comments`.`post_uuid`, `comments`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` LEFT JOIN `post_comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` AND (`comments`.`comment_text` LIKE ?);',
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
              AddressSchema,
              'addresses',
            ).setSelect(['direction']),
            {
              parent_field: 'uuid',
              join_field: 'user_uuid',
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
          'SELECT `users`.`uuid`, `users`.`email`, `users`.`username`, `users`.`created_at`, `permissions`.`name`, `addresses`.`direction` ' +
            'FROM `user` AS `users` ' +
            `INNER JOIN \`user_permission_link\` AS \`${pivotAliasForPermissions}\` ON \`users\`.\`uuid\` = \`${pivotAliasForPermissions}\`.\`user_ref_in_pivot\` ` +
            `INNER JOIN \`permission\` AS \`permissions\` ON \`${pivotAliasForPermissions}\`.\`permission_ref_in_pivot\` = \`permissions\`.\`uuid\` ` +
            'LEFT JOIN `address` AS `addresses` ON `users`.`uuid` = `addresses`.`user_uuid` ' +
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` ORDER BY `posts`.`title` ASC;',
      );
      expect(translator.getParams()).toEqual([]);
    });

    it('should translate a RootCriteria with multiple ORDER BY clauses', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .orderBy('user_uuid', OrderDirection.DESC)
        .orderBy('title', OrderDirection.ASC);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` ORDER BY `posts`.`user_uuid` DESC, `posts`.`title` ASC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` DESC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `publisher`.`username` ASC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` LEFT JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `publisher`.`email` DESC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC;',
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
            PostCommentSchema,
            'comments',
          ).orderBy('comment_text', OrderDirection.ASC),
          { parent_field: 'uuid', join_field: 'post_uuid' },
        );

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at`, `comments`.`uuid`, `comments`.`comment_text`, `comments`.`user_uuid`, `comments`.`post_uuid`, `comments`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` LEFT JOIN `post_comment` AS `comments` ON `posts`.`uuid` = `comments`.`post_uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC, `comments`.`comment_text` ASC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` LIMIT ?;',
      );
      expect(translator.getParams()).toEqual([10]);
    });

    it('should translate a RootCriteria with LIMIT (take) and OFFSET (skip)', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .setTake(5)
        .setSkip(10);

      const query = translator.translate(criteria, '');
      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` LIMIT ? OFFSET ?;',
      );
      expect(translator.getParams()).toEqual([5, 10]);
    });

    it('should NOT add LIMIT or OFFSET if take is 0, even if skip is set', () => {
      const criteria = CriteriaFactory.GetCriteria(PostSchema, 'posts')
        .setTake(0)
        .setSkip(5);

      const query = translator.translate(criteria, '');

      expect(query).toBe(
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts`;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` WHERE (`posts`.`body` LIKE ?) ORDER BY `posts`.`title` ASC;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at` FROM `post` AS `posts` WHERE (`posts`.`title` LIKE ?) ORDER BY `posts`.`title` ASC LIMIT ? OFFSET ?;',
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
        'SELECT `posts`.`uuid`, `posts`.`title`, `posts`.`body`, `posts`.`user_uuid`, `posts`.`created_at`, `publisher`.`uuid`, `publisher`.`email`, `publisher`.`username`, `publisher`.`created_at` FROM `post` AS `posts` INNER JOIN `user` AS `publisher` ON `posts`.`user_uuid` = `publisher`.`uuid` ORDER BY `posts`.`title` ASC, `publisher`.`username` DESC LIMIT ? OFFSET ?;',
      );
      expect(translator.getParams()).toEqual([3, 6]);
    });
  });
});
