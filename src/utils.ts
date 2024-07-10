import type {
  ComponentDefinition,
  ComponentDefinitionProvider, ComponentDefinitionProviderFn,
  GeneratorOptions
} from './definitions';
type ValueCalcFn<T> = (name: string, options: GeneratorOptions) => T;
type ValueCalc<T> = T | ValueCalcFn<T>;

interface CompProps {
  name: string;
  componentName?: ValueCalc<string>;
  fileName?: ValueCalc<string>;
  filePath?: ValueCalc<string>;
  importPath?: ValueCalc<string>;
  importName?: ValueCalc<string>;
  importStatement?: ValueCalc<string>;
  useLazyLoad?: ValueCalc<boolean>;
}

function isValueCalcFn<T>(value: ValueCalc<T>): value is ValueCalcFn<T> {
  return typeof value === 'function';
}

function calc<T>(
  input: ValueCalc<T>,
  name: string,
  options: GeneratorOptions,
): T {
  if (isValueCalcFn(input)) {
    return input(name, options);
  }

  return input;
}

export function comp(name: string): ComponentDefinitionProviderFn;
export function comp(props: CompProps): ComponentDefinitionProviderFn;
export function comp(arg: string | CompProps): ComponentDefinitionProviderFn {
  let props: CompProps;
  if (typeof arg === 'string') {
    props = {
      name: arg,
    };
  } else {
    props = arg;
  }

  return (options): ComponentDefinition => {
    return {
      name: props.name,
      componentName: calc(props.componentName, 'componentName', options),
      fileName: calc(props.fileName, 'fileName', options),
      filePath: calc(props.filePath, 'filePath', options),
      importPath: calc(props.importPath, 'importPath', options),
      importName: calc(props.importName, 'importName', options),
      importStatement: calc(props.importStatement, 'importStatement', options),
      useLazyLoad: calc(props.useLazyLoad, 'useLazyLoad', options) ?? true,
    };
  };
}
