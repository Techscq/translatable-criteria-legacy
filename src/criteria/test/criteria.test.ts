import { RootCriteria } from '../root.criteria.js';
import { CommentSchema, PostSchema, UserSchema } from './fake/fake.schema.js';
import { FilterGroup } from '../filter/filter-group.js';
import { OrderDirection } from '../order/order.js';
import { InnerJoinCriteria } from '../inner.join-criteria.js';
import { LeftJoinCriteria } from '../left.join-criteria.js';
import type { StoredJoinDetails } from '../types/join-utility.types.js';
import type { CriteriaSchema, SelectedAliasOf } from '../types/schema.types.js';
import { FilterOperator, LogicalOperator } from '../types/operator.types.js';

const testJoinsData = (
  joinDetails: StoredJoinDetails<CriteriaSchema>,
  joinParameter: { join_field: string | object; parent_field: string | object },
  criteria: RootCriteria<CriteriaSchema, SelectedAliasOf<CriteriaSchema>>,
) => {
  expect(joinDetails.parameters.join_field).toBe(joinParameter.join_field);
  expect(joinDetails.parameters.parent_field).toBe(joinParameter.parent_field);
  expect(joinDetails.parameters.parent_alias).toBe(criteria.alias);
  expect(joinDetails.parameters.parent_source_name).toBe(criteria.sourceName);
};
describe('Criteria', () => {
  let criteriaRoot = new RootCriteria(PostSchema, 'posts');

  beforeEach(() => {
    criteriaRoot = new RootCriteria(PostSchema, 'posts');
  });

  it('should be created with ROOT type', () => {
    expect(criteriaRoot).toBeInstanceOf(RootCriteria);
    expect(criteriaRoot.sourceName).toBe(PostSchema.source_name);
    expect(criteriaRoot.alias).toBe('posts');
  });

  it('should have default take and skip values', () => {
    expect(criteriaRoot.take).toBe(0); //0 meaning no limit
    expect(criteriaRoot.skip).toBe(0);
  });

  it('should have empty orders and joins initially', () => {
    expect(criteriaRoot.orders).toEqual([]);
    expect(criteriaRoot.joins).toEqual([]);
  });

  it('should set root filter group with where', () => {
    const filter = {
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
    const criteria = criteriaRoot.where(filter);
    expect(criteria).toBe(criteriaRoot);
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
    const criteria = criteriaRoot.where(filter1).andWhere(filter2);
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
    const criteria = criteriaRoot.where(filter1).orWhere(filter2);
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

    const criteria = criteriaRoot
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

    const criteria = criteriaRoot
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
      expect(criteriaRoot.select).toEqual([
        'uuid',
        'title',
        'body',
        'user_uuid',
      ]);
    });

    it('should allow selecting specific fields', () => {
      criteriaRoot.setSelect(['uuid', 'title']);
      expect(criteriaRoot.select).toEqual(['uuid', 'title']);
    });

    it('should validate selected fields exist in schema', () => {
      expect(() => {
        // @ts-expect-error Testing invalid field
        criteriaRoot.setSelect(['non_existent_field']);
      }).toThrow();
    });

    it('should maintain selected fields after other operations', () => {
      criteriaRoot
        .setSelect(['uuid', 'title'])
        .where({ field: 'uuid', operator: FilterOperator.EQUALS, value: '1' })
        .orderBy('uuid', OrderDirection.ASC);

      expect(criteriaRoot.select).toEqual(['uuid', 'title']);
    });
  });

  describe('cursor functionality', () => {
    const testUuid = 'test-uuid';

    it('should set cursor with composite key correctly', () => {
      criteriaRoot.setCursor(
        [
          { field: 'uuid', value: testUuid },
          { field: 'user_uuid', value: 'user-1' },
        ],
        FilterOperator.GREATER_THAN,
        OrderDirection.ASC,
      );

      const cursor = criteriaRoot.cursor;
      expect(cursor).toBeDefined();
      if (cursor) {
        expect(cursor.filters).toHaveLength(2);
        expect(cursor.order).toBe(OrderDirection.ASC);
      }
    });

    it('should validate cursor fields exist in schema', () => {
      expect(() => {
        criteriaRoot.setCursor(
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
        criteriaRoot.setCursor(
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
        criteriaRoot.setCursor(
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
      criteriaRoot.setTake(10).setSkip(20);
      expect(criteriaRoot.take).toBe(10);
      expect(criteriaRoot.skip).toBe(20);
    });

    it('should validate take and skip are non-negative', () => {
      expect(() => criteriaRoot.setTake(-1)).toThrow();
      expect(() => criteriaRoot.setSkip(-1)).toThrow();
    });

    it('should set order correctly', () => {
      criteriaRoot.orderBy('uuid', OrderDirection.DESC);
      expect(criteriaRoot.orders).toHaveLength(1);
      expect(criteriaRoot.orders[0]!.direction).toBe(OrderDirection.DESC);
      expect(criteriaRoot.orders[0]!.field).toBe('uuid');
    });

    it('should allow multiple orders', () => {
      criteriaRoot
        .orderBy('uuid', OrderDirection.DESC)
        .orderBy('title', OrderDirection.ASC);

      expect(criteriaRoot.orders).toHaveLength(2);
      expect(criteriaRoot.orders[0]!.field).toBe('uuid');
      expect(criteriaRoot.orders[1]!.field).toBe('title');
    });
  });

  describe('joins functionality', () => {
    it('should add an inner join', () => {
      const userJoinCriteria = new InnerJoinCriteria(UserSchema, 'publisher');
      const joinParameter = {
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      criteriaRoot.join(userJoinCriteria, joinParameter);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        expect(joinEntry.criteria.alias).toBe('publisher');
        expect(joinEntry.criteria).instanceof(InnerJoinCriteria);
        testJoinsData(joinEntry, joinParameter, criteriaRoot);
        expect(joinEntry.criteria).toBe(userJoinCriteria);
      }
    });

    it('should add multiple joins', () => {
      const userJoinCriteria = new InnerJoinCriteria(UserSchema, 'publisher');
      const userJoinParameter = {
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      const commentJoinCriteria = new LeftJoinCriteria(
        CommentSchema,
        'comments',
      );
      const commentJoinParameter = {
        parent_field: 'uuid',
        join_field: 'post_uuid',
      } as const;

      criteriaRoot
        .join(userJoinCriteria, userJoinParameter)
        .join(commentJoinCriteria, commentJoinParameter);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(2);

      const publisherJoin = joinsArray.find(
        (entry) => entry.criteria.alias === 'publisher',
      );
      const commentsJoin = joinsArray.find(
        (entry) => entry.criteria.alias === 'comments',
      );

      expect(publisherJoin).toBeDefined();
      if (publisherJoin) {
        expect(publisherJoin.criteria.alias).toBe('publisher');
        expect(publisherJoin.criteria).instanceof(InnerJoinCriteria);
        testJoinsData(publisherJoin, userJoinParameter, criteriaRoot);
        expect(publisherJoin.criteria).toBe(userJoinCriteria);
      }

      expect(commentsJoin).toBeDefined();
      if (commentsJoin) {
        expect(commentsJoin.criteria.alias).toBe('comments');
        expect(commentsJoin.criteria).instanceof(LeftJoinCriteria);
        testJoinsData(commentsJoin, commentJoinParameter, criteriaRoot);
        expect(commentsJoin.criteria).toBe(commentJoinCriteria);
      }
    });

    it('should replace a join if the same alias is used', () => {
      const userJoinCriteria1 = new InnerJoinCriteria(UserSchema, 'publisher');
      const userJoinCriteria2 = new LeftJoinCriteria(UserSchema, 'publisher');

      const userJoinParameter = {
        parent_field: 'user_uuid',
        join_field: 'uuid',
      } as const;

      criteriaRoot
        .join(userJoinCriteria1, userJoinParameter)
        .join(userJoinCriteria2, userJoinParameter);

      const joinsArray = criteriaRoot.joins;
      expect(joinsArray.length).toBe(1);

      const joinEntry = joinsArray[0];
      expect(joinEntry).toBeDefined();
      if (joinEntry) {
        expect(joinEntry.criteria.alias).toBe('publisher');
        expect(joinEntry.criteria).instanceof(LeftJoinCriteria);
        testJoinsData(joinEntry, userJoinParameter, criteriaRoot);
        expect(joinEntry.criteria).toBe(userJoinCriteria2);
      }
    });
  });

  describe('complex criteria building', () => {
    it('should build a complete criteria with all features', () => {
      const criteria = new RootCriteria(PostSchema, 'posts')
        .setSelect(['uuid', 'title', 'user_uuid'])
        .where({
          field: 'title',
          operator: FilterOperator.LIKE,
          value: '%test%',
        })
        .join(
          new InnerJoinCriteria(CommentSchema, 'comments')
            .setSelect(['uuid', 'comment_text'])
            .where({
              field: 'comment_text',
              operator: FilterOperator.IS_NOT_NULL,
              value: null,
            }),
          {
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
