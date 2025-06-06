import { Criteria } from '../criteria.js';
import { CommentSchema, PostSchema, UserSchema } from './fake/fake.schema.js';
import {
  CriteriaType,
  FilterOperator,
  LogicalOperator,
} from '../types/criteria.types.js';
import { FilterGroup } from '../filter/filter-group.js';

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
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
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
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
    const filter2 = {
      field: 'title',
      operator: FilterOperator.LIKE,
      value: '%test%',
    } as const;
    const criteria = rootCriteria.where(filter1).andWhere(filter2);
    expect(criteria.rootFilterGroup.toPrimitive()).toEqual({
      logicalOperator: LogicalOperator.AND,
      items: [filter1, filter2],
    });
  });

  it('should OR filters with orWhere, creating OR( AND(f1), AND(f2) )', () => {
    const filter1 = {
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
    const filter2 = {
      field: 'title',
      operator: FilterOperator.LIKE,
      value: '%test%',
    } as const;
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
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
    const filter2 = {
      field: 'title',
      operator: FilterOperator.LIKE,
      value: '%test%',
    } as const;
    const filter3 = {
      field: 'body',
      operator: FilterOperator.CONTAINS,
      value: 'content',
    } as const;

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
      field: 'uuid',
      operator: FilterOperator.EQUALS,
      value: 'abc',
    } as const;
    const filter2 = {
      field: 'title',
      operator: FilterOperator.LIKE,
      value: '%test%',
    } as const;
    const filter3 = {
      field: 'body',
      operator: FilterOperator.CONTAINS,
      value: 'content',
    } as const;

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

  it('should add an inner join', () => {
    const userJoinCriteria = Criteria.CreateInnerJoin(UserSchema, 'publisher');
    const joinParameter = {
      parent_to_join_relation_type: 'many_to_one',
      parent_field: 'user_uuid',
      join_field: 'uuid',
    } as const;

    rootCriteria.join(userJoinCriteria, joinParameter);

    const joinsArray = rootCriteria.joins;
    expect(joinsArray.length).toBe(1);

    const joinEntry = joinsArray[0];

    if (!joinEntry) {
      throw new Error('Expected join entry to exist');
    }

    const [alias, storedJoinDetails] = joinEntry;
    expect(alias).toBe('publisher');
    expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.INNER_JOIN);
    expect(storedJoinDetails.parameters).toEqual(joinParameter);
    expect(storedJoinDetails.criteria).toBe(userJoinCriteria);
  });

  it('should add multiple joins', () => {
    const userJoinCriteria = Criteria.CreateInnerJoin(UserSchema, 'publisher');
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

    const publisherJoin = joinsArray.find((entry) => entry[0] === 'publisher');
    const commentsJoin = joinsArray.find((entry) => entry[0] === 'comments');

    if (publisherJoin) {
      const [, storedJoinDetails] = publisherJoin;
      expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.INNER_JOIN);
      expect(storedJoinDetails.parameters).toEqual(userJoinParameter);
      expect(storedJoinDetails.criteria).toBe(userJoinCriteria);
    } else {
      throw new Error('Expected publisher join to exist');
    }

    if (commentsJoin) {
      const [, storedJoinDetails] = commentsJoin;
      expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.LEFT_JOIN);
      expect(storedJoinDetails.parameters).toEqual(commentJoinParameter);
      expect(storedJoinDetails.criteria).toBe(commentJoinCriteria);
    } else {
      throw new Error('Expected comments join to exist');
    }
  });

  it('should replace a join if the same alias is used', () => {
    const userJoinCriteria1 = Criteria.CreateInnerJoin(UserSchema, 'publisher');
    const userJoinParameter1 = {
      parent_to_join_relation_type: 'many_to_one',
      parent_field: 'user_uuid',
      join_field: 'uuid',
    } as const;

    const userJoinCriteria2 = Criteria.CreateLeftJoin(UserSchema, 'publisher');
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
    if (!joinEntry) {
      throw new Error('Expected join entry to exist');
    }

    const [alias, storedJoinDetails] = joinEntry;
    expect(alias).toBe('publisher');
    expect(storedJoinDetails.type).toBe(CriteriaType.JOIN.LEFT_JOIN);
    expect(storedJoinDetails.parameters).toEqual(userJoinParameter2);
    expect(storedJoinDetails.criteria).toBe(userJoinCriteria2);
  });
});
