import { CriteriaFactory } from '../criteria-factory.js';
import { RootCriteria } from '../root.criteria.js';
import { InnerJoinCriteria } from '../inner.join-criteria.js';
import { LeftJoinCriteria } from '../left.join-criteria.js';
import { OuterJoinCriteria } from '../outer.join-criteria.js';
import {
  UserSchema,
  PostSchema,
} from '../translator/infrastructure/test/fake/fake-entities.js';

describe('CriteriaFactory', () => {
  describe('GetCriteria', () => {
    it('should create a RootCriteria instance with correct sourceName and alias', () => {
      const alias = UserSchema.alias[0]!;
      const criteria = CriteriaFactory.GetCriteria(UserSchema, alias);

      expect(criteria).toBeInstanceOf(RootCriteria);
      expect(criteria.sourceName).toBe(UserSchema.source_name);
      expect(criteria.alias).toBe(alias);
    });
  });

  describe('GetInnerJoinCriteria', () => {
    it('should create an InnerJoinCriteria instance with correct sourceName and alias', () => {
      const alias = PostSchema.alias[0]!;
      const criteria = CriteriaFactory.GetInnerJoinCriteria(PostSchema, alias);

      expect(criteria).toBeInstanceOf(InnerJoinCriteria);
      expect(criteria.sourceName).toBe(PostSchema.source_name);
      expect(criteria.alias).toBe(alias);
    });
  });

  describe('GetLeftJoinCriteria', () => {
    it('should create a LeftJoinCriteria instance with correct sourceName and alias', () => {
      const alias = PostSchema.alias[0]!;
      const criteria = CriteriaFactory.GetLeftJoinCriteria(PostSchema, alias);

      expect(criteria).toBeInstanceOf(LeftJoinCriteria);
      expect(criteria.sourceName).toBe(PostSchema.source_name);
      expect(criteria.alias).toBe(alias);
    });
  });

  describe('GetOuterJoinCriteria', () => {
    it('should create an OuterJoinCriteria instance with correct sourceName and alias', () => {
      const alias = PostSchema.alias[0]!;
      const criteria = CriteriaFactory.GetOuterJoinCriteria(PostSchema, alias);

      expect(criteria).toBeInstanceOf(OuterJoinCriteria);
      expect(criteria.sourceName).toBe(PostSchema.source_name);
      expect(criteria.alias).toBe(alias);
    });
  });
});
