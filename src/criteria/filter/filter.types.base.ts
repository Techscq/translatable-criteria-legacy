import {
  type FilterOperator,
  LogicalOperator,
} from '../types/operators.types.js';

export type SimpleValue = string | number | boolean | null;
export type FilterValue = SimpleValue | SimpleValue[] | undefined;

export interface FilterPrimitive<Field extends string = string> {
  readonly field: Field;
  readonly operator: FilterOperator;
  readonly value: FilterValue;
}

export type FilterItem<Field extends string> =
  | FilterPrimitive<Field>
  | FilterGroupPrimitive<Field>;

export interface FilterGroupPrimitive<Field extends string = string> {
  readonly logicalOperator: LogicalOperator;
  readonly items: ReadonlyArray<FilterItem<Field>>;
}

export interface IFilterExpression {
  toPrimitive(): FilterPrimitive | FilterGroupPrimitive;
}

export interface IFilterVisitor<Source, Output = Source> {
  visitFilter(
    filter: IFilterExpression & FilterPrimitive,
    context: Source,
  ): Output | Promise<Output>;
  visitAndGroup(
    group: IFilterExpression & FilterGroupPrimitive,
    context: Source,
  ): Output | Promise<Output>;
  visitOrGroup(
    group: IFilterExpression & FilterGroupPrimitive,
    context: Source,
  ): Output | Promise<Output>;
}
