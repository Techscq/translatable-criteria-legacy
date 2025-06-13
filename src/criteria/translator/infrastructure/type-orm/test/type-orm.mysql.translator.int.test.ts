import { TypeOrmMysqlTranslator } from '../type-orm.mysql.translator.js';
import { EntityNotFoundError, type ObjectLiteral } from 'typeorm';
import { CriteriaFactory } from '../../../../criteria-factory.js';
import { FilterOperator } from '../../../../types/operator.types.js';
import {
  getTypeORMQueryBuilderFor,
  initializeDataSource,
  seedDatabaseWith,
} from './type-orm.utils.js';
import {
  PostSchema as CriteriaPostSchema,
  UserSchema as CriteriaUserSchema,
  PostCommentSchema as CriteriaCommentSchema,
  type Post as CriteriaPost,
  type User as CriteriaUser,
  PermissionSchema,
  type Permission,
} from '../../test/fake/fake-entities.js';
import { UserEntity } from '../entities/user.entity.js';
import { PostEntity } from '../entities/post.entity.js';
import { OrderDirection } from '../../../../order/order.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionEntity } from '../entities/permission.entity.js';

describe('TypeOrmMysqlTranslator', async () => {
  let translator: TypeOrmMysqlTranslator<ObjectLiteral>;
  await initializeDataSource();

  const allFakeData = await seedDatabaseWith();
  let usersEntities: CriteriaUser[] = allFakeData.fakeUsers;
  let postsEntities: CriteriaPost[] = allFakeData.fakePosts;

  beforeEach(async () => {
    translator = new TypeOrmMysqlTranslator();
  });

  describe('Syntax Translation - visitRoot with Filters', () => {
    it('should translate a simple WHERE clause', async () => {
      const alias = CriteriaUserSchema.alias[0];
      if (!usersEntities || usersEntities.length === 0) {
        throw new Error('usersEntities is empty, cannot run test');
      }
      const testUser = usersEntities[0]!;

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'email',
        operator: FilterOperator.EQUALS,
        value: testUser.email,
      });
      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);

      expect(qb.getSql()).toContain(`WHERE (\`${alias}\`.\`email\` = ?)`);
      expect(qb.getParameters()).toEqual({ param_0: testUser.email });
    });

    it('should translate an AND WHERE clause', async () => {
      const alias = CriteriaUserSchema.alias[0];
      if (!usersEntities || usersEntities.length < 2) {
        throw new Error('usersEntities needs at least 2 users for this test');
      }
      const userForLike = usersEntities[0]!;
      const userForNotEquals = usersEntities[1]!;

      const criteria = CriteriaFactory.GetCriteria(CriteriaUserSchema, alias)
        .where({
          field: 'username',
          operator: FilterOperator.LIKE,
          value: `%${userForLike.username.substring(0, 3)}%`,
        })
        .andWhere({
          field: 'email',
          operator: FilterOperator.NOT_EQUALS,
          value: userForNotEquals.email,
        });
      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);

      expect(qb.getSql()).toContain(
        `WHERE (\`${alias}\`.\`username\` LIKE ? AND \`${alias}\`.\`email\` != ?)`,
      );
      expect(qb.getParameters()).toEqual({
        param_0: `%${userForLike.username.substring(0, 3)}%`,
        param_1: userForNotEquals.email,
      });
    });

    it('should translate an OR WHERE clause', async () => {
      const alias = CriteriaPostSchema.alias[0];
      if (!postsEntities || postsEntities.length < 2) {
        throw new Error(
          'fakePostsEntities needs at least 2 posts for this test',
        );
      }
      const postForEquals = postsEntities[0]!;
      const postForContains = postsEntities[1]!;

      const criteria = CriteriaFactory.GetCriteria(CriteriaPostSchema, alias)
        .where({
          field: 'title',
          operator: FilterOperator.EQUALS,
          value: postForEquals.title,
        })
        .orWhere({
          field: 'body',
          operator: FilterOperator.CONTAINS,
          value: `%${postForContains.body.substring(5, 15)}%`,
        });
      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        alias,
      );
      translator.translate(criteria, qb);

      expect(qb.getSql()).toContain(
        `WHERE ((\`${alias}\`.\`title\` = ?) OR (\`${alias}\`.\`body\` LIKE ?))`,
      );
      expect(qb.getParameters()).toEqual({
        param_0: postForEquals.title,
        param_1: `%${postForContains.body.substring(5, 15)}%`,
      });
    });

    it('should translate complex nested AND/OR filters for root criteria', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const criteria = CriteriaFactory.GetCriteria(CriteriaUserSchema, alias)
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

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);
      const sql = qb.getSql();
      expect(sql).toContain(
        `WHERE ((\`${alias}\`.\`email\` LIKE ? AND \`${alias}\`.\`username\` = ?) OR (\`${alias}\`.\`username\` = ?) OR (\`${alias}\`.\`uuid\` = ?))`,
      );
      expect(qb.getParameters()).toEqual({
        param_0: '%@example.com%',
        param_1: 'user_1',
        param_2: 'user_2',
        param_3: 'some-uuid',
      });
    });

    it('should translate IS NULL and IS NOT NULL operators', async () => {
      const alias = CriteriaPostSchema.alias[0];
      const criteria = CriteriaFactory.GetCriteria(CriteriaPostSchema, alias)
        .where({
          field: 'body',
          operator: FilterOperator.IS_NULL,
          value: null,
        })
        .orWhere({
          field: 'title',
          operator: FilterOperator.IS_NOT_NULL,
          value: null,
        });
      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        alias,
      );
      translator.translate(criteria, qb);

      expect(qb.getSql()).toContain(
        `WHERE ((\`${alias}\`.\`body\` IS NULL) OR (\`${alias}\`.\`title\` IS NOT NULL))`,
      );
      expect(qb.getParameters()).toEqual({});
    });

    it('should translate IN operator', async () => {
      const alias = CriteriaUserSchema.alias[0];
      if (!usersEntities || usersEntities.length < 2) {
        throw new Error('usersEntities needs at least 2 users for this test');
      }
      const userIds = [usersEntities[0]!.uuid, usersEntities[1]!.uuid];

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'uuid',
        operator: FilterOperator.IN,
        value: userIds,
      });
      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);

      expect(qb.getSql()).toContain(`WHERE (\`${alias}\`.\`uuid\` IN (?, ?))`);
      expect(qb.getParameters()).toEqual({ param_0: userIds });
    });
  });

  describe('Syntax Translation - Join Translation', () => {
    it('should translate a simple INNER JOIN and select all from joined entity', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const postRelationAlias = 'posts';

      const rootCriteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      );
      const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
        CriteriaPostSchema,
        postRelationAlias,
      );

      const joinParams = {
        parent_field: 'uuid',
        join_field: 'user_uuid',
      } as const;
      rootCriteria.join(postJoinCriteria, joinParams);

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(rootCriteria, qb);
      const sql = qb.getSql();

      expect(sql).toContain(`INNER JOIN \`post\` \`${postRelationAlias}\``);
      expect(sql).toMatch(
        new RegExp(
          `SELECT .*?\`${userAlias}\`\\.\`\\w+\` AS \`${userAlias}_\\w+\``,
        ),
      );
      expect(sql).toContain(
        '`posts`.`uuid` AS `posts_uuid`, `posts`.`created_at` AS `posts_created_at`, `posts`.`body` AS `posts_body`, `posts`.`title` AS `posts_title`, `posts`.`user_uuid`',
      );
    });

    it('should translate a LEFT JOIN and select specific fields from joined entity', async () => {
      const postAlias = CriteriaPostSchema.alias[0];
      const commentRelationAlias = 'comments';

      const rootCriteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postAlias,
      );
      const commentJoinCriteria = CriteriaFactory.GetLeftJoinCriteria(
        CriteriaCommentSchema,
        commentRelationAlias,
      ).setSelect(['uuid', 'comment_text']);

      const joinParams = {
        parent_field: 'uuid',
        join_field: 'post_uuid',
      } as const;
      rootCriteria.join(commentJoinCriteria, joinParams);

      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postAlias,
      );
      translator.translate(rootCriteria, qb);
      const sql = qb.getSql();

      expect(sql).toContain(
        `LEFT JOIN \`post_comment\` \`${commentRelationAlias}\``,
      );
      expect(sql).toContain(
        `\`${commentRelationAlias}\`.\`uuid\` AS \`${commentRelationAlias}_uuid\``,
      );
      expect(sql).toContain(
        `\`${commentRelationAlias}\`.\`comment_text\` AS \`${commentRelationAlias}_comment_text\``,
      );
      expect(sql).not.toContain(
        `\`${commentRelationAlias}\`.\`created_at\` AS \`${commentRelationAlias}_created_at\``,
      );
    });

    it('should translate an INNER JOIN with a simple ON condition', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const postRelationAlias = 'posts';

      if (!postsEntities || postsEntities.length === 0)
        throw new Error('fakePostsEntities is empty for ON condition test');
      const specificPostTitlePart = postsEntities[0]!.title.substring(0, 5);

      const rootCriteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      );
      const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
        CriteriaPostSchema,
        postRelationAlias,
      ).where({
        field: 'title',
        operator: FilterOperator.LIKE,
        value: `%${specificPostTitlePart}%`,
      });

      const joinParams = {
        parent_field: 'uuid',
        join_field: 'user_uuid',
      } as const;
      rootCriteria.join(postJoinCriteria, joinParams);

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(rootCriteria, qb);
      const sql = qb.getSql();
      const params = qb.getParameters();

      expect(sql).toContain(`INNER JOIN \`post\` \`${postRelationAlias}\``);
      expect(sql).toContain(
        `ON \`${postRelationAlias}\`.\`user_uuid\`=\`${userAlias}\`.\`uuid\` AND (\`${postRelationAlias}\`.\`title\` LIKE ?)`,
      );
      expect(params['param_0']).toBe(`%${specificPostTitlePart}%`);
    });

    it('should translate an INNER JOIN with complex nested AND/OR ON condition', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const postRelationAlias = 'posts';

      const rootCriteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      );
      const postJoinCriteria = CriteriaFactory.GetInnerJoinCriteria(
        CriteriaPostSchema,
        postRelationAlias,
      )
        .where({
          field: 'title',
          operator: FilterOperator.LIKE,
          value: '%TypeORM%',
        })
        .andWhere({
          field: 'body',
          operator: FilterOperator.CONTAINS,
          value: '%important%',
        })
        .orWhere({
          field: 'body',
          operator: FilterOperator.CONTAINS,
          value: '%relevant%',
        });

      const joinParams = {
        parent_field: 'uuid',
        join_field: 'user_uuid',
      } as const;
      rootCriteria.join(postJoinCriteria, joinParams);
      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(rootCriteria, qb);
      const sql = qb.getSql();

      expect(sql).toContain(
        `ON \`${postRelationAlias}\`.\`user_uuid\`=\`${userAlias}\`.\`uuid\` AND ((\`${postRelationAlias}\`.\`title\` LIKE ? AND \`${postRelationAlias}\`.\`body\` LIKE ?) OR (\`${postRelationAlias}\`.\`body\` LIKE ?))`,
      );
      expect(qb.getParameters()).toEqual({
        param_0: '%TypeORM%',
        param_1: '%important%',
        param_2: '%relevant%',
      });
    });

    it('should translate a LEFT JOIN with complex nested AND/OR ON condition', async () => {
      const postAlias = CriteriaPostSchema.alias[0];
      const commentRelationAlias = 'comments';

      const rootCriteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postAlias,
      );
      const commentJoinCriteria = CriteriaFactory.GetLeftJoinCriteria(
        CriteriaCommentSchema,
        commentRelationAlias,
      )
        .where({
          field: 'comment_text',
          operator: FilterOperator.NOT_LIKE,
          value: '%spam%',
        })
        .orWhere({
          field: 'user_uuid',
          operator: FilterOperator.EQUALS,
          value: 'specific-user-uuid',
        })
        .andWhere({
          field: 'created_at',
          operator: FilterOperator.GREATER_THAN,
          value: '2023-01-01',
        });

      const joinParams = {
        parent_field: 'uuid',
        join_field: 'post_uuid',
      } as const;
      rootCriteria.join(commentJoinCriteria, joinParams);
      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postAlias,
      );
      translator.translate(rootCriteria, qb);
      const sql = qb.getSql();

      expect(sql).toContain(
        `ON \`${commentRelationAlias}\`.\`post_uuid\`=\`${postAlias}\`.\`uuid\` AND ((\`${commentRelationAlias}\`.\`comment_text\` NOT LIKE ?) OR (\`${commentRelationAlias}\`.\`user_uuid\` = ? AND \`${commentRelationAlias}\`.\`created_at\` > ?))`,
      );
      expect(qb.getParameters()).toEqual({
        param_0: '%spam%',
        param_1: 'specific-user-uuid',
        param_2: '2023-01-01',
      });
    });
  });

  describe('Integration Tests - getMany()', () => {
    it('should fetch all users matching fakeUsers data', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const criteria = CriteriaFactory.GetCriteria(CriteriaUserSchema, alias);

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);
      const fetchedUsers = await qb.getMany();

      expect(fetchedUsers).toHaveLength(usersEntities.length);

      for (const expectedUser of usersEntities) {
        const actualUserInDb = fetchedUsers.find(
          (dbUser) => dbUser.uuid === expectedUser.uuid,
        );
        expect(
          actualUserInDb,
          `User with UUID ${expectedUser.uuid} (expected email: ${expectedUser.email}) not found in DB.`,
        ).toBeDefined();

        if (actualUserInDb) {
          expect(
            actualUserInDb.email,
            `Email mismatch for UUID ${expectedUser.uuid}. Expected ${expectedUser.email} (from memory array), but DB has ${actualUserInDb.email}`,
          ).toBe(expectedUser.email);
          expect(
            actualUserInDb.username,
            `Username mismatch for UUID ${expectedUser.uuid}. Expected ${expectedUser.username}, but DB has ${actualUserInDb.username}`,
          ).toBe(expectedUser.username);
        }
      }
    });

    it('should fetch users filtered by email using getMany()', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const targetUser = usersEntities.find(
        (u) => u.email === 'user1@example.com',
      );
      if (!targetUser)
        throw new Error(
          'Test data: user1@example.com not found in fakeUsersEntities',
        );

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'email',
        operator: FilterOperator.EQUALS,
        value: targetUser.email,
      });

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);
      const fetchedUsers = await qb.getMany();

      expect(fetchedUsers).toHaveLength(1);
      expect(
        fetchedUsers[0]!.uuid,
        `Expected UUID ${targetUser.uuid} for email ${targetUser.email}, but got ${fetchedUsers[0]?.uuid}`,
      ).toBe(targetUser.uuid);
      expect(fetchedUsers[0]!.email).toBe(targetUser.email);
    });

    it('should fetch posts with their publisher (user) using INNER JOIN and getMany()', async () => {
      const postCriteriaRootAlias = CriteriaPostSchema.alias[0];
      const publisherRelationJoinAlias = 'publisher';

      const knownUser = usersEntities.find((u) => u.username === 'user_1');
      if (!knownUser) throw new Error('Test data: user_1 not found');

      const postWithKnownPublisher = postsEntities.find(
        (p) => p.publisher?.uuid === knownUser.uuid,
      );

      if (!postWithKnownPublisher || !postWithKnownPublisher.publisher) {
        throw new Error(
          'Test data: Post with known publisher (user_1) not found in fakePostsEntities.',
        );
      }

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postCriteriaRootAlias,
      )
        .join(
          CriteriaFactory.GetInnerJoinCriteria(
            CriteriaUserSchema,
            publisherRelationJoinAlias,
          ),
          { parent_field: 'user_uuid', join_field: 'uuid' },
        )
        .where({
          field: 'uuid',
          operator: FilterOperator.EQUALS,
          value: postWithKnownPublisher.uuid,
        });

      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postCriteriaRootAlias,
      );
      translator.translate(criteria, qb);
      const fetchedPosts = await qb.getMany();
      expect(fetchedPosts).toHaveLength(1);
      const fetchedPost = fetchedPosts[0]!;
      expect(fetchedPost.uuid).toBe(postWithKnownPublisher.uuid);
      expect(
        fetchedPost.publisher,
        `Publisher should be defined and hydrated for post UUID ${fetchedPost.uuid}`,
      ).toBeDefined();
      if (fetchedPost.publisher) {
        expect(fetchedPost.publisher.uuid).toBe(
          postWithKnownPublisher.publisher.uuid,
        );
        expect(fetchedPost.publisher.username).toBe(
          postWithKnownPublisher.publisher.username,
        );
      }
    });
  });

  describe('Integration Tests - Complex Filtering, Pagination, and Ordering', () => {
    it('should fetch root entities with complex nested AND/OR filters', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      )
        .where({
          field: 'email',
          operator: FilterOperator.CONTAINS,
          value: '%user1%',
        })
        .andWhere({
          field: 'username',
          operator: FilterOperator.EQUALS,
          value: 'user_1',
        })
        .orWhere({
          field: 'email',
          operator: FilterOperator.CONTAINS,
          value: '%user2%',
        })
        .andWhere({
          field: 'username',
          operator: FilterOperator.EQUALS,
          value: 'user_2',
        })
        .orderBy('email', OrderDirection.ASC);

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(criteria, qb);
      const fetchedUsers = await qb.getMany();
      expect(fetchedUsers).toHaveLength(2);
      expect(fetchedUsers[0]!.email).toBe('user1@example.com');
      expect(fetchedUsers[1]!.email).toBe('user2@example.com');
    });

    it('should fetch entities with INNER JOIN and complex ON condition filters', async () => {
      const postAlias = CriteriaPostSchema.alias[0];
      const publisherAlias = 'publisher';

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postAlias,
      )
        .join(
          CriteriaFactory.GetInnerJoinCriteria(
            CriteriaUserSchema,
            publisherAlias,
          )
            .where({
              field: 'username',
              operator: FilterOperator.EQUALS,
              value: 'user_1',
            })
            .andWhere({
              field: 'email',
              operator: FilterOperator.CONTAINS,
              value: '%user1%',
            })
            .orWhere({
              field: 'username',
              operator: FilterOperator.EQUALS,
              value: 'user_2',
            })
            .andWhere({
              field: 'email',
              operator: FilterOperator.CONTAINS,
              value: '%user2%',
            }),
          { parent_field: 'user_uuid', join_field: 'uuid' },
        )
        .orderBy(`created_at`, OrderDirection.ASC);

      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postAlias,
      );
      translator.translate(criteria, qb);
      const fetchedPosts = await qb.getMany();

      const expectedPublisherUsernames = ['user_1', 'user_2'];
      const actualPublisherUsernames = fetchedPosts.map(
        (p) => p.publisher.username,
      );

      fetchedPosts.forEach((post) => {
        expect(
          post.publisher,
          `Post ${post.uuid} should have a publisher`,
        ).toBeDefined();
        if (post.publisher) {
          expect(
            expectedPublisherUsernames,
            `Publisher ${post.publisher.username} not expected`,
          ).toContain(post.publisher.username);
        }
      });

      const uniqueFetchedPublishers = new Set(actualPublisherUsernames);
      usersEntities
        .filter((u) => expectedPublisherUsernames.includes(u.username))
        .forEach((expectedUser) => {
          if (
            postsEntities.some((p) => p.publisher.uuid === expectedUser.uuid)
          ) {
            expect(
              uniqueFetchedPublishers.has(expectedUser.username),
              `Expected posts from publisher ${expectedUser.username}`,
            ).toBe(true);
          }
        });
      expect(fetchedPosts.length).toBeGreaterThan(0);
    });

    it('should fetch root entities with orderBy, take, and skip', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const take = 2;
      const skip = 1;

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      )
        .orderBy('email', OrderDirection.ASC)
        .setTake(take)
        .setSkip(skip);

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(criteria, qb);
      const fetchedUsers = await qb.getMany();
      expect(fetchedUsers).toHaveLength(take);
      const sortedAllUsers = [...usersEntities].sort((a, b) =>
        a.email.localeCompare(b.email),
      );

      if (sortedAllUsers.length > skip + 1) {
        expect(fetchedUsers[0]!.uuid).toBe(sortedAllUsers[skip]!.uuid);
        expect(fetchedUsers[1]!.uuid).toBe(sortedAllUsers[skip + 1]!.uuid);
      } else if (sortedAllUsers.length > skip) {
        expect(fetchedUsers[0]!.uuid).toBe(sortedAllUsers[skip]!.uuid);
      }
    });

    it('should fetch entities ordered by a field in a joined table with pagination', async () => {
      const postAlias = CriteriaPostSchema.alias[0];
      const publisherAlias = 'publisher';
      const take = 3;
      const skip = 1;

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postAlias,
      )
        .join(
          CriteriaFactory.GetInnerJoinCriteria(
            CriteriaUserSchema,
            publisherAlias,
          ).orderBy('username', OrderDirection.DESC),
          { parent_field: 'user_uuid', join_field: 'uuid' },
        )
        .setTake(take)
        .setSkip(skip);

      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postAlias,
      );
      translator.translate(criteria, qb);
      const fetchedPosts = await qb.getMany();

      expect(fetchedPosts.length).toBeLessThanOrEqual(take);
      fetchedPosts.forEach((post) => {
        expect(post.publisher).toBeDefined();
      });

      const allPossiblePosts = postsEntities
        .filter((p) => p.publisher)
        .sort((a, b) =>
          b.publisher.username.localeCompare(a.publisher.username),
        );
      if (allPossiblePosts.length > skip) {
        const expectedSlice = allPossiblePosts.slice(skip, skip + take);
        expect(fetchedPosts.length).toBe(expectedSlice.length);
      } else {
        expect(fetchedPosts.length).toBe(0);
      }
    });

    it('should fetch root entities using cursor-based pagination (created_at and uuid)', async () => {
      const userAlias = CriteriaUserSchema.alias[0];
      const pageSize = 2;

      const criteriaPage1 = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      )
        .orderBy('created_at', OrderDirection.ASC)
        .orderBy('uuid', OrderDirection.ASC)
        .setTake(pageSize);

      const qbPage1 = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(criteriaPage1, qbPage1);
      const page1Users = await qbPage1.getMany();

      expect(page1Users.length).toBeGreaterThan(0);
      expect(page1Users.length).toBeLessThanOrEqual(pageSize);
      if (page1Users.length === 0) return;

      const lastUserPage1 = page1Users[page1Users.length - 1]!;

      const criteriaPage2 = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      )
        .setCursor(
          [
            { field: 'created_at', value: lastUserPage1.created_at },
            { field: 'uuid', value: lastUserPage1.uuid },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        )
        .orderBy('created_at', OrderDirection.ASC)
        .orderBy('uuid', OrderDirection.ASC)
        .setTake(pageSize);

      const qbPage2 = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(criteriaPage2, qbPage2);
      const page2Users = await qbPage2.getMany();

      expect(page2Users.length).toBeGreaterThanOrEqual(0);
      if (page2Users.length > 0) {
        const firstUserPage2 = page2Users[0]!;
        const lastUserPage1Date = new Date(lastUserPage1.created_at).getTime();
        const firstUserPage2Date = new Date(
          firstUserPage2.created_at,
        ).getTime();

        expect(firstUserPage2Date).toBeGreaterThanOrEqual(lastUserPage1Date);
        if (firstUserPage2Date === lastUserPage1Date) {
          expect(firstUserPage2.uuid > lastUserPage1.uuid).toBe(true);
        }
      }
    });
  });

  describe('Integration Tests - getOne() / getOneOrFail()', () => {
    it('should fetch a single user by UUID using getOne()', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const targetUser = usersEntities.find((u) => u.username === 'user_2');
      if (!targetUser) throw new Error('Test data: user_2 not found');

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: targetUser.uuid,
      });

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);
      const fetchedUser = await qb.getOne();

      expect(fetchedUser).not.toBeNull();
      expect(fetchedUser?.uuid).toBe(targetUser.uuid);
      expect(fetchedUser?.email).toBe(targetUser.email);
    });

    it('should return null with getOne() if no user matches', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: nonExistentUuid,
      });

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);
      const fetchedUser = await qb.getOne();

      expect(fetchedUser).toBeNull();
    });

    it('should fetch a post and its comments using LEFT JOIN and getOne()', async () => {
      const postCriteriaRootAlias = CriteriaPostSchema.alias[0];
      const commentsRelationJoinAlias = 'comments';

      const targetPostWithComments = postsEntities.find(
        (p) =>
          p.comments && p.comments.length > 0 && p.title === 'Post Title 1',
      );
      if (!targetPostWithComments || !targetPostWithComments.comments) {
        throw new Error(
          'Test data: Post with comments (Title 1) not found in fakePostsEntities.',
        );
      }

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaPostSchema,
        postCriteriaRootAlias,
      )
        .join(
          CriteriaFactory.GetLeftJoinCriteria(
            CriteriaCommentSchema,
            commentsRelationJoinAlias,
          ),
          { parent_field: 'uuid', join_field: 'post_uuid' },
        )
        .where({
          field: 'uuid',
          operator: FilterOperator.EQUALS,
          value: targetPostWithComments.uuid,
        });

      const qb = await getTypeORMQueryBuilderFor<CriteriaPost>(
        PostEntity,
        postCriteriaRootAlias,
      );
      translator.translate(criteria, qb);
      const fetchedPost = await qb.getOne();
      expect(fetchedPost).not.toBeNull();
      expect(fetchedPost?.uuid).toBe(targetPostWithComments.uuid);
      expect(
        fetchedPost?.comments,
        `Comments should be defined and hydrated for post UUID ${fetchedPost?.uuid}`,
      ).toBeDefined();
      if (fetchedPost?.comments) {
        expect(fetchedPost.comments).toHaveLength(
          targetPostWithComments.comments.length,
        );
        targetPostWithComments.comments.forEach((fakeComment) => {
          const fetchedComment = fetchedPost!.comments.find(
            (c) => c.uuid === fakeComment.uuid,
          );
          expect(
            fetchedComment,
            `Comment with UUID ${fakeComment.uuid} not found in fetched post's comments`,
          ).toBeDefined();
          if (fetchedComment) {
            expect(fetchedComment.comment_text).toBe(fakeComment.comment_text);
          }
        });
      }
    });

    it('should throw EntityNotFoundError with getOneOrFail() if no user matches', async () => {
      const alias = CriteriaUserSchema.alias[0];
      const nonExistentUuid = '11111111-1111-1111-1111-111111111111';

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        alias,
      ).where({
        field: 'uuid',
        operator: FilterOperator.EQUALS,
        value: nonExistentUuid,
      });

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        alias,
      );
      translator.translate(criteria, qb);

      await expect(qb.getOneOrFail()).rejects.toThrow(EntityNotFoundError);
    });
  });
  describe('Integration Tests - Many-to-Many Relationships', () => {
    it('should fetch users with their permissions (many-to-many)', async () => {
      const userAlias = CriteriaUserSchema.alias[0]; // 'users'
      const permissionAlias = 'permissions';

      const targetUser = usersEntities.find(
        (u) => u.username === 'user_1' && u.permissions.length > 0,
      );
      if (!targetUser) {
        throw new Error(
          'Test data: user_1 with permissions not found in fakeUsersEntities',
        );
      }

      const criteria = CriteriaFactory.GetCriteria(
        CriteriaUserSchema,
        userAlias,
      )
        .where({
          field: 'uuid',
          operator: FilterOperator.EQUALS,
          value: targetUser.uuid,
        })
        .join(
          CriteriaFactory.GetInnerJoinCriteria(
            PermissionSchema,
            permissionAlias,
          ),
          {
            pivot_source_name: 'permission_user',
            parent_field: { pivot_field: 'user_uuid', reference: 'uuid' },
            join_field: {
              pivot_field: 'permission_uuid',
              reference: 'uuid',
            },
          },
        );

      const qb = await getTypeORMQueryBuilderFor<CriteriaUser>(
        UserEntity,
        userAlias,
      );
      translator.translate(criteria, qb);
      const fetchedUsers = await qb.getMany();

      const sql = qb.getSql();
      expect(sql).toContain(
        `INNER JOIN \`permission_user\` \`${userAlias}_${permissionAlias}\``,
      );
      expect(sql).toContain(
        `ON \`${userAlias}_${permissionAlias}\`.\`user_uuid\`=\`${userAlias}\`.\`uuid\``,
      );
      expect(sql).toContain(
        `INNER JOIN \`permission\` \`${permissionAlias}\` ON \`${permissionAlias}\`.\`uuid\`=\`${userAlias}_${permissionAlias}\`.\`permission_uuid\``,
      );
      expect(sql).toContain(`WHERE (\`${userAlias}\`.\`uuid\` = ?)`);
      expect(qb.getParameters()).toEqual({ param_0: targetUser.uuid });

      expect(fetchedUsers).toHaveLength(1);
      const fetchedUser = fetchedUsers[0]!;
      expect(fetchedUser.uuid).toBe(targetUser.uuid);
      expect(fetchedUser.permissions).toBeDefined();
      expect(fetchedUser.permissions).toHaveLength(
        targetUser.permissions.length,
      );

      targetUser.permissions.forEach((expectedPerm) => {
        const actualPerm = fetchedUser.permissions.find(
          (p) => p.uuid === expectedPerm.uuid,
        );
        expect(actualPerm).toBeDefined();
        expect(actualPerm?.name).toBe(expectedPerm.name);
      });
    });

    it('should fetch permissions with their users (many-to-many) and filter on joined entity', async () => {
      const permissionAlias = PermissionSchema.alias[0]; // 'permissions'
      const userAlias = 'users';

      const userWithPermission = allFakeData.fakeUsers.find(
        (u) =>
          u.permissions &&
          u.permissions.length > 0 &&
          u.permissions.find((p) => p.name === 'permission_name_1'),
      );
      if (!userWithPermission) {
        throw new Error('Test data: users with permission not found');
      }

      const permission = userWithPermission.permissions.find(
        (p) => p.name === 'permission_name_1',
      );
      if (!permission) {
        throw new Error('Test data: permission permission_name_1 not found');
      }

      const criteria = CriteriaFactory.GetCriteria(
        PermissionSchema,
        permissionAlias,
      )
        .where({
          field: 'uuid',
          operator: FilterOperator.EQUALS,
          value: permission.uuid,
        })
        .join(
          CriteriaFactory.GetInnerJoinCriteria(
            CriteriaUserSchema,
            userAlias,
          ).where({
            field: 'username',
            operator: FilterOperator.EQUALS,
            value: userWithPermission.username,
          }),
          {
            pivot_source_name: 'permission_user',
            parent_field: {
              pivot_field: 'permission_uuid',
              reference: 'uuid',
            },
            join_field: { pivot_field: 'user_uuid', reference: 'uuid' },
          },
        );

      const qb = await getTypeORMQueryBuilderFor<Permission>(
        PermissionEntity,
        permissionAlias,
      );
      translator.translate(criteria, qb);
      const fetchedPermissions = await qb.getMany();

      const sql = qb.getSql();
      expect(sql).toContain(
        `INNER JOIN \`permission_user\` \`${permissionAlias}_${userAlias}\``,
      );
      expect(sql).toContain(
        `ON \`${permissionAlias}_${userAlias}\`.\`permission_uuid\`=\`${permissionAlias}\`.\`uuid\``,
      );
      expect(sql).toContain(
        `INNER JOIN \`user\` \`${userAlias}\` ON \`${userAlias}\`.\`uuid\`=\`${permissionAlias}_${userAlias}\`.\`user_uuid\``,
      );
      expect(sql).toContain(`AND (\`${userAlias}\`.\`username\` = ?)`);
      expect(sql).toContain(`WHERE (\`${permissionAlias}\`.\`uuid\` = ?)`);
      expect(qb.getParameters()).toEqual({
        param_0: permission.uuid,
        param_1: userWithPermission.username,
      });
      expect(fetchedPermissions).toHaveLength(1);
      const fetchedPermission = fetchedPermissions[0]!;
      expect(fetchedPermission.uuid).toBe(permission.uuid);
      expect(fetchedPermission.users).toBeDefined();
      expect(fetchedPermission.users).toHaveLength(1);
      expect(fetchedPermission.users![0]!.uuid).toBe(userWithPermission.uuid);
      expect(fetchedPermission.users![0]!.username).toBe(
        userWithPermission.username,
      );
    });
  });
});
