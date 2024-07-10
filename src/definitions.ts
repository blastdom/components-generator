export interface ComponentDefinition {
  name: string;
  componentName?: string;
  fileName?: string;
  filePath?: string;
  importPath?: string;
  importName?: string;
  importStatement?: string;
  useLazyLoad: boolean;
}

export type ComponentDefinitionProviderFn = (
  options: GeneratorOptions
) => ComponentDefinition;

export interface ComponentDefinitionProviderObj {
  name: string;
  componentName?: string;
  fileName?: string;
  filePath?: string;
  importPath?: string;
  importName?: string;
  importStatement?: string;
  useLazyLoad?: boolean;
}

export type ComponentDefinitionProvider =
  | string
  | ComponentDefinitionProviderFn
  | ComponentDefinitionProviderObj
  ;

export interface OptionsInput {
  fileExtension?: string;
  componentsFolder?: string;
  srcFolder?: string;
  importsPrefix: string;
  componentNamePrefix?: string;
  indexFilename?: string;
  definitionFilename?: string;
  definitionName?: string;
  javaNamespace?: string;
}

export type Options = Required<OptionsInput>;

export interface Generators {
  componentName: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentProperties: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentFileName: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentFileNameDirect: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentFilePath: (
    filename: string,
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentImportPath: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentImportName: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentImportStatement: (
    name: string,
    path: string,
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string | undefined;
  componentCreatorImportStatement: (
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  componentExportStatement: (
    importName: string,
    importPath: string,
    name: string,
    properties: string,
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
  javaProviderName: (
    options: Options,
    provider: ProviderDefinition
  ) => string;
  javaBaseComponentName: (
    options: Options,
    provider: ProviderDefinition
  ) => string,
  javaComponentName: (
    name: string,
    component: ComponentDefinition,
    options: Options,
    provider: ProviderDefinition
  ) => string;
}

export interface ProviderDefinition {
  name: string;
  description: string;
  version: string;
  author: string;
  url: string;
  source: string;
  options: OptionsInput;
  generators?: Partial<Generators>;
  components: ComponentDefinitionProvider[];
}

export interface GeneratorOptions {
  provider: ProviderDefinition;
  options: Options;
  generators: Generators;
  components: ComponentDefinition[];
  outDir: string;
}
