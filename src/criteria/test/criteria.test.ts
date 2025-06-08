import { Criteria } from '../criteria.js';
import { CommentSchema, PostSchema, UserSchema } from './fake/fake.schema.js';
import {
  CriteriaType,
  FilterOperator,
  LogicalOperator,
} from '../types/criteria.types.js';
import { FilterGroup } from '../filter/filter-group.js';
import { OrderDirection } from '../order/order.js';

describe('Criteria', () => {
  let rootCriteria: Criteria<typeof PostSchema, 'posts'>;

  beforeEach(() => {
    rootCriteria = Criteria.Create(PostSchema, 'posts');
  });

  it('should be created with ROOT type', () => {
    expect(rootCriteria).toBeInstanceOf(Criteria);
    expect(rootCriteria.type).toBe(CriteriaType.ROOT);
    expect(rootCriteria.sourceName).toBe(PostSchema.source_name);
    expect(rootCriteria.alias).toBe('posts');
  });

  it('should have default take and skip values', () => {
    expect(rootCriteria.take).toBe(0); //0 meaning no limit
    expect(rootCriteria.skip).toBe(0);
  });

  it('should have empty orders and joins initially', () => {
    expect(rootCriteria.orders).toEqual([]);
    expect(rootCriteria.joins).toEqual([]);
  });

  it('should set root filter group with where', () => {
    const filter = {
      field: 'uuid' as const,
      operator: FilterOperator.EQUALS,
      value: 'abc',
    };
    const criteria = rootCriteria.where(filter);
    expect(criteria).toBe(rootCriteria);
    expect(criteria.rootFilterGroup).toBeInstanceOf(FilterGroup);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.AND,
      items: [filter],
    });
  });

  it('should AND filters with andWhere for a flatter structure', () => {
    const filter1 = {
      field: 'uuid' as const,
      operator: FilterOperator.EQUALS,
      value: 'abc',
    };
    const filter2 = {
      field: 'title' as const,
      operator: FilterOperator.LIKE,
      value: '%test%',
    };
    const criteria = rootCriteria.where(filter1).andWhere(filter2);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.AND,
      items: [filter1, filter2],
    });
  });

  it('should OR filters with orWhere, creating OR( AND(f1), AND(f2) )', () => {
    const filter1 = {
      field: 'uuid' as const,
      operator: FilterOperator.EQUALS,
      value: 'abc',
    };
    const filter2 = {
      field: 'title' as const,
      operator: FilterOperator.LIKE,
      value: '%test%',
    };
    const criteria = rootCriteria.where(filter1).orWhere(filter2);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.OR,
      items: [
        { logicalOperator: LogicalOperator.AND, items: [filter1] },
        { logicalOperator: LogicalOperator.AND, items: [filter2] },
      ],
    });
  });

  it('should handle sequence: where().andWhere().orWhere()', () => {
    const filter1 = {
      field: 'uuid' as const,
      operator: FilterOperator.EQUALS,
      value: 'abc',
    };
    const filter2 = {
      field: 'title' as const,
      operator: FilterOperator.LIKE,
      value: '%test%',
    };
    const filter3 = {
      field: 'body' as const,
      operator: FilterOperator.CONTAINS,
      value: 'content',
    };

    const criteria = rootCriteria
      .where(filter1)
      .andWhere(filter2)
      .orWhere(filter3);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.OR,
      items: [
        { logicalOperator: LogicalOperator.AND, items: [filter1, filter2] },
        { logicalOperator: LogicalOperator.AND, items: [filter3] },
      ],
    });
  });

  it('should handle sequence: where().orWhere().andWhere()', () => {
    const filter1 = {
      field: 'uuid' as const,
      operator: FilterOperator.EQUALS,
      value: 'abc',
    };
    const filter2 = {
      field: 'title' as const,
      operator: FilterOperator.LIKE,
      value: '%test%',
    };
    const filter3 = {
      field: 'body' as const,
      operator: FilterOperator.CONTAINS,
      value: 'content',
    };

    const criteria = rootCriteria
      .where(filter1)
      .orWhere(filter2)
      .andWhere(filter3);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.OR,
      items: [
        { logicalOperator: LogicalOperator.AND, items: [filter1] },
        { logicalOperator: LogicalOperator.AND, items: [filter2, filter3] },
      ],
    });
  });

  describe('select functionality', () => {
    it('should select all fields by default', () => {
      expect(rootCriteria.select).toEqual([
        'uuid',
        'title',
        'body',
        'user_uuid',
      ]);
    });

    it('should allow selecting specific fields', () => {
      rootCriteria.setSelect(['uuid', 'title']);
      expect(rootCriteria.select).toEqual(['uuid', 'title']);
    });

    it('should validate selected fields exist in schema', () => {
      expect(() => {
        // @ts-expect-error Testing invalid field
        rootCriteria.setSelect(['non_existent_field']);
      }).toThrow();
    });

    it('should maintain selected fields after other operations', () => {
      rootCriteria
        .setSelect(['uuid', 'title'])
        .where({ field: 'uuid', operator: FilterOperator.EQUALS, value: '1' })
        .orderBy('uuid', OrderDirection.ASC);

      expect(rootCriteria.select).toEqual(['uuid', 'title']);
    });
  });

  describe('cursor functionality', () => {
    const testUuid = 'test-uuid';

    it('should set cursor with composite key correctly', () => {
      rootCriteria.setCursor(
        [
          { field: 'uuid', value: testUuid },
          { field: 'user_uuid', value: 'user-1' },
        ],
        FilterOperator.GREATER_THAN,
        OrderDirection.ASC,
      );

      const cursor = rootCriteria.cursor;
      expect(cursor).toBeDefined();
      if (cursor) {
        expect(cursor.filters).toHaveLength(2);
        expect(cursor.order).toBe(OrderDirection.ASC);
      }
    });

    it('should validate cursor fields exist in schema', () => {
      expect(() => {
        rootCriteria.setCursor(
          [
            // @ts-expect-error Testing invalid field
            { field: 'non_existent', value: 'test' },
            { field: 'uuid', value: testUuid },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow();
    });

    it('should not allow duplicate fields in cursor', () => {
      expect(() => {
        rootCriteria.setCursor(
          [
            { field: 'uuid', value: testUuid },
            { field: 'uuid', value: testUuid },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow();
    });

    it('should validate cursor values are not null or undefined', () => {
      expect(() => {
        rootCriteria.setCursor(
          [
            { field: 'uuid', value: null },
            { field: 'user_uuid', value: undefined },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );
      }).toThrow();
    });
  });

  describe('pagination and ordering', () => {
    it('should set take and skip values correctly', () => {
      rootCriteria.setTake(10).setSkip(20);
      expect(rootCriteria.take).toBe(10);
      expect(rootCriteria.skip).toBe(20);
    });

    it('should validate take and skip are non-negative', () => {
      expect(() => rootCriteria.setTake(-1)).toThrow();
      expect(() => rootCriteria.setSkip(-1)).toThrow();
    });

    it('should set order correctly', () => {
      rootCriteria.orderBy('uuid', OrderDirection.DESC);
      expect(rootCriteria.orders).toHaveLength(1);
      expect(rootCriteria.orders[0]!.direction).toBe(OrderDirection.DESC);
      expect(rootCriteria.orders[0]!.field).toBe('uuid');
    });

    it('should allow multiple orders', () => {
      rootCriteria
        .orderBy('uuid', OrderDirection.DESC)
        .orderBy('title', OrderDirection.ASC);

      expect(rootCriteria.orders).toHaveLength(2);
      expect(rootCriteria.orders[0]!.field).toBe('uuid');
      expect(rootCriteria.orders[1]!.field).toBe('title');
    });
  });

  describe('joins functionality', () => {
    it('should add an inner join', () => {
      const userJoinCriteria = Criteria.CreateInnerJoin(
        UserSchema,
        'publisher',
      );
      const joinParameter = {
        parent_to_join_relation_type: 'many_to_one',
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      rootCriteria.join(userJoinCriteria, joinParameter);

      const joinsArray = rootCriteria.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        const [alias, storedJoinDetails] = joinEntry;
        expect(alias).toBe('publisher');
        expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.INNER_JOIN);
        expect(storedJoinDetails.parameters).toEqual(joinParameter);
        expect(storedJoinDetails.criteria).toBe(userJoinCriteria);
      }
    });

    it('should add multiple joins', () => {
      const userJoinCriteria = Criteria.CreateInnerJoin(
        UserSchema,
        'publisher',
      );
      const userJoinParameter = {
        parent_to_join_relation_type: 'many_to_one',
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      const commentJoinCriteria = Criteria.CreateLeftJoin(
        CommentSchema,
        'comments',
      );
      const commentJoinParameter = {
        parent_to_join_relation_type: 'one_to_many',
        parent_field: 'uuid',
        join_field: 'post_uuid',
      } as const;

      rootCriteria
        .join(userJoinCriteria, userJoinParameter)
        .join(commentJoinCriteria, commentJoinParameter);

      const joinsArray = rootCriteria.joins;
      expect(joinsArray.length).toBe(2);

      const publisherJoin = joinsArray.find(
        (entry) => entry[0] === 'publisher',
      );
      const commentsJoin = joinsArray.find((entry) => entry[0] === 'comments');

      expect(publisherJoin).toBeDefined();
      if (publisherJoin) {
        const [, storedJoinDetails] = publisherJoin;
        expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.INNER_JOIN);
        expect(storedJoinDetails.parameters).toEqual(userJoinParameter);
        expect(storedJoinDetails.criteria).toBe(userJoinCriteria);
      }

      expect(commentsJoin).toBeDefined();
      if (commentsJoin) {
        const [, storedJoinDetails] = commentsJoin;
        expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.LEFT_JOIN);
        expect(storedJoinDetails.parameters).toEqual(commentJoinParameter);
        expect(storedJoinDetails.criteria).toBe(commentJoinCriteria);
      }
    });

    it('should replace a join if the same alias is used', () => {
      const userJoinCriteria1 = Criteria.CreateInnerJoin(
        UserSchema,
        'publisher',
      );
      const userJoinParameter1 = {
        parent_to_join_relation_type: 'many_to_one',
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      const userJoinCriteria2 = Criteria.CreateLeftJoin(
        UserSchema,
        'publisher',
      );
      const userJoinParameter2 = {
        parent_to_join_relation_type: 'many_to_one',
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      rootCriteria
        .join(userJoinCriteria1, userJoinParameter1)
        .join(userJoinCriteria2, userJoinParameter2);

      const joinsArray = rootCriteria.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        const [alias, storedJoinDetails] = joinEntry;
        expect(alias).toBe('publisher');
        expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.LEFT_JOIN);
        expect(storedJoinDetails.parameters).toEqual(userJoinParameter2);
        expect(storedJoinDetails.criteria).toBe(userJoinCriteria2);
      }
    });
  });

  describe('complex criteria building', () => {
    it('should build a complete criteria with all features', () => {
      const criteria = Criteria.Create(PostSchema, 'posts')
        .setSelect(['uuid', 'title', 'user_uuid'])
        .where({
          field: 'title',
          operator: FilterOperator.LIKE,
          value: '%test%',
        })
        .join(
          Criteria.CreateInnerJoin(CommentSchema, 'comments')
            .setSelect(['uuid', 'comment_text'])
            .where({
              field: 'comment_text',
              operator: FilterOperator.IS_NOT_NULL,
              value: null,
            }),
          {
            parent_to_join_relation_type: 'one_to_many',
            parent_field: 'uuid',
            join_field: 'post_uuid',
          },
        )
        .orderBy('uuid', OrderDirection.ASC)
        .setTake(10)
        .setCursor(
          [
            { field: 'uuid', value: 'last-uuid' },
            { field: 'user_uuid', value: 'last-user' },
          ],
          FilterOperator.GREATER_THAN,
          OrderDirection.ASC,
        );

      const cursor = criteria.cursor;
      expect(criteria.select).toEqual(['uuid', 'title', 'user_uuid']);
      expect(criteria.take).toBe(10);
      expect(cursor).toBeDefined();
      if (cursor) {
        expect(cursor.filters).toHaveLength(2);
      }
      expect(criteria.joins).toHaveLength(1);
      expect(criteria.orders).toHaveLength(1);
    });
  });
});
