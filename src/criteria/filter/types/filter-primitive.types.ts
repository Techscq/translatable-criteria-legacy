import {
  type FilterOperator,
  LogicalOperator,
} from '../../types/operator.types.js';
import type {
  CriteriaSchema,
  FieldOfSchema,
} from '../../types/schema.types.js';

/**
 * Represents a simple, single value that can be used in a filter.
 * It can be a string, number, boolean, or null.
 */
type SimpleValue = string | number | boolean | null;

/**
 * Represents the value part of a filter.
 * It can be a {@link SimpleValue}, an array of {@link SimpleValue} (e.g., for 'IN' operators),
 * or undefined (though typically null is used for operators like IS_NULL).
 */
export type FilterValue = SimpleValue | SimpleValue[] | undefined;

/**
 * Defines the structure for a single filter condition.
 * It specifies the field to filter on, the operator to use, and the value to compare against.
 * @template Field - A string literal type representing the valid field names for this filter,
 * typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}. Defaults to `string`.
 */
export interface FilterPrimitive<
  Field extends string = FieldOfSchema<CriteriaSchema>,
> {
  /** The name of the field to apply the filter to. */
  readonly field: Field;
  /** The comparison operator to use for the filter. */
  readonly operator: FilterOperator;
  /** The value to compare the field against. Its type can vary based on the operator. */
  readonly value: FilterValue;
}

/**
 * Represents an item within a filter group.
 * It can be either a single {@link FilterPrimitive} or another nested {@link FilterGroupPrimitive}.
 * @template Field - A string literal type representing the valid field names,
 * typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}.
 */
type FilterItem<Field extends string> =
  | FilterPrimitive<Field>
  | FilterGroupPrimitive<Field>;

/**
 * Defines the structure for a group of filter conditions.
 * Filters within a group are combined using a specified logical operator (AND/OR).
 * @template Field - A string literal type representing the valid field names for filters
 * within this group, typically derived from {@link FieldOfSchema} of a {@link CriteriaSchema}. Defaults to `string`.
 */
export interface FilterGroupPrimitive<
  Field extends string = FieldOfSchema<CriteriaSchema>,
> {
  /** The logical operator (AND/OR) used to combine the items in this group. */
  readonly logicalOperator: LogicalOperator;
  /** An array of filter items, which can be individual filters or nested filter groups. */
  readonly items: ReadonlyArray<FilterItem<Field>>;
}
