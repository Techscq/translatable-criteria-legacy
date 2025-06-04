import { FilterOperator } from './operators.types.js';

export type FilterValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null
  | undefined;

export type FilterPrimitive<T extends string = string> = {
  field: T;
  operator: FilterOperator;
  value: FilterValue;
};

export class Filter {
  protected readonly _field: string;
  protected readonly _operator: FilterOperator;
  protected readonly _value: FilterValue;

  constructor(primitive: FilterPrimitive) {
    this._field = primitive.field;
    this._operator = primitive.operator;
    this._value = primitive.value;
  }

  get field(): string {
    return this._field;
  }

  get operator(): FilterOperator {
    return this._operator;
  }

  get value(): FilterValue {
    return this._value;
  }

  toPrimitive(): FilterPrimitive {
    return {
      field: this._field,
      operator: this._operator,
      value: this._value,
    };
  }
}
