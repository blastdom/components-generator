/* eslint-disable @typescript-eslint/ban-types */
import { TypeFromName } from '@framjet/types';
import { Objects } from '@framjet/common';
import { Assignable, HasUndefined } from 'type-plus';

function isValidType<T extends string>(value: unknown, type: T): value is TypeFromName<T> {
  return Objects.isType(value, type as never);
}

type Simplify<T> = { [K in keyof T]: T[K] } & {};
type SpecificValidationResult<A, B> = ValidationResult<Assignable<A, B, { distributive: false }>>;

type Error = {
  path: string,
  message: string,
  value?: unknown,
  expected?: string
}

type ValidationResult<V extends boolean = boolean> = Simplify<{
  valid: V,
  type: string,
  typeMatch: boolean,
  errors: Error[]
}>;
type ValidatorFn<T> = <I>(value: I, path: string) => SpecificValidationResult<I, T>;
type InferValidatorType<T> = T extends ValidatorFn<infer V> ? V : never;

type MapObjectType<T> = {
  [K in keyof T as HasUndefined<InferValidatorType<T[K]>> extends true ? never : K]: InferValidatorType<T[K]>
} & {
  [K in keyof T as HasUndefined<InferValidatorType<T[K]>> extends true ? K : never]?: InferValidatorType<T[K]>
} & {};

function createValidator<T extends string>(type: T): ValidatorFn<TypeFromName<T>> {
  return <I>(value: I, path: string): SpecificValidationResult<I, TypeFromName<T>> => {
    const valid = isValidType(value, type);

    const errors: Error[] = [];
    if (!valid) {
      errors.push({
        path,
        message: `${path} should be a "${type}", but "${typeof value}" was given`,
        value,
        expected: type
      });
    }

    return {
      valid,
      type,
      typeMatch: valid,
      errors
    } as never;
  };
}

const Type = {
  string: createValidator('string'),
  number: createValidator('number'),
  boolean: createValidator('boolean'),
  object: createValidator('object'),
  function: createValidator('Function'),
  null: createValidator('null'),
  undefined: createValidator('undefined'),
  array: <T>(validator: ValidatorFn<T>): ValidatorFn<T[]> => <I>(value: I, path: string): SpecificValidationResult<I, T[]> => {
    if (value == null || !Array.isArray(value)) {
      return {
        valid: false,
        type: 'array',
        typeMatch: false,
        errors: [{
          path,
          message: `${path} should be an "array", but "${typeof value}" was given`,
          value,
          expected: 'array'
        }]
      } as never;
    }

    const errors: Error[] = [];
    let typeName = 'array';
    let valid = true;

    value.forEach((item: I, idx: number) => {
      const result = validator(item, `${path}[${idx}]`);
      if (!result.valid) {
        valid = false;
        errors.push(...result.errors);
      }

      typeName = result.type;
    });

    return { valid, type: `${typeName}[]`, errors } as never;
  },
  schema: <T extends Record<PropertyKey, ValidatorFn<any>>>(schema: T, allowExtraFields: boolean): ValidatorFn<MapObjectType<T>> => (value: unknown, path: string) => {
    if (!Type.object(value, path).valid) {
      return {
        valid: false,
        type: 'object',
        typeMatch: false,
        errors: [{
          path,
          message: `${path} should be an "object", but "${typeof value}" was given`,
          value,
          expected: 'object'
        }]
      } as never;
    }

    const errors: Error[] = [];
    const types = new Map<string, string>();
    let valid = true;

    const objKeys = new Set(Object.keys(value as object));

    Object.entries(schema).forEach(([key, validator]) => {
      const val = (value as object)[key];
      const p = `${path}.${key}`;

      objKeys.delete(key);

      const result = validator(val, p);
      if (!result.valid) {
        valid = false;
        errors.push(...result.errors);
      }

      types.set(key, result.type);
    });

    if (objKeys.size > 0 && !allowExtraFields) {
      objKeys.forEach((key) => {
        errors.push({
          path: `${path}.${key}`,
          message: `${path}.${key} is unexpected field`,
          value: (value as never)[key],
          expected: 'never'
        });
      });
    }

    return { valid, type: JSON.stringify(types), typeMatch: true, errors } as never;
  },
  union: <T extends ValidatorFn<any>[]>(...validators: T): ValidatorFn<InferValidatorType<T[number]>> => (value: unknown, path: string) => {
    let valid = false;
    const errors: Error[] = [];
    const types = new Set<string>();
    let typeMatched = false;
    validators.forEach(v => {
      const r = v(value, path);

      if (r.valid) {
        valid = true;
        typeMatched = true;
      } else if (r.typeMatch) {
        typeMatched = true;
        errors.push(...r.errors);
      }

      types.add(r.type);
    });

    return {
      valid: valid,
      type: `(${[...types].join(' | ')})`,
      typeMatch: typeMatched,
      errors: valid ? [] : (typeMatched ? errors : [{
        path,
        message: `${path} should be a "(${[...types].join(' | ')})", but "${typeof value}" was given`,
        value,
        expected: [...types].join(' | ')
      }])
    } as never;
  },
  required: <T>(validator: ValidatorFn<T>): ValidatorFn<T> => <I>(value: I, path: string): SpecificValidationResult<I, T> => {
    if (value == null) {
      return {
        valid: false,
        type: validator(value, path).type,
        typeMatch: false,
        errors: [{
          path,
          message: `${path} is required, but "${typeof value}" was given`,
          value
        }]
      } as never;
    }

    return validator(value, path) as never;
  },
  optional: <T>(validator: ValidatorFn<T>): ValidatorFn<T | null | undefined> => {
    return <I>(value: I, path: string): SpecificValidationResult<I, T | null | undefined> => {
      if (value == null) {
        return { valid: true, type: validator(value, path).type, typeMatch: true, errors: [] } as never;
      }

      return validator(value, path) as never;
    };
  }
};

export const providerDefinitionSchema = Type.schema({
  name: Type.required(Type.string),
  description: Type.required(Type.string),
  version: Type.required(Type.string),
  author: Type.required(Type.string),
  url: Type.required(Type.string),
  source: Type.required(Type.string),
  options: Type.required(
    Type.schema(
      {
        fileExtension: Type.optional(Type.string),
        componentsFolder: Type.optional(Type.string),
        srcFolder: Type.optional(Type.string),
        importsPrefix: Type.required(Type.string),
        componentNamePrefix: Type.optional(Type.string),
        indexFilename: Type.optional(Type.string),
        definitionFilename: Type.optional(Type.string),
        definitionName: Type.optional(Type.string)
      },
      false
    )
  ),
  generators: Type.optional(Type.object),
  components: Type.required(
    Type.array(
      Type.union(
        Type.string,
        Type.function,
        Type.schema(
          {
            name: Type.required(Type.string),
            componentName: Type.optional(Type.string),
            fileName: Type.optional(Type.string),
            filePath: Type.optional(Type.string),
            importPath: Type.optional(Type.string),
            importName: Type.optional(Type.string),
            importStatement: Type.optional(Type.string),
            useLazyLoad: Type.optional(Type.boolean)
          },
          false
        )
      )
    )
  )
}, false);
