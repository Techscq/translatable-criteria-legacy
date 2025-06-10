import {
  type FilterOperator,
  LogicalOperator,
} from '../../types/operator.types.js';
type SimpleValue = string | number | boolean | null;
export type FilterValue = SimpleValue | SimpleValue[] | undefined;

export interface FilterPrimitive<Field extends string = string> {
  readonly field: Field;
  readonly operator: FilterOperator;
  readonly value: FilterValue;
}

type FilterItem<Field extends string> =
  | FilterPrimitive<Field>
  | FilterGroupPrimitive<Field>;

export interface FilterGroupPrimitive<Field extends string = string> {
  readonly logicalOperator: LogicalOperator;
  readonly items: ReadonlyArray<FilterItem<Field>>;
}
