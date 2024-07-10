import type { ComponentDefinition, Generators, Options, ProviderDefinition } from './definitions';
import { Strings } from '@framjet/common';

export function processOptions(provider: ProviderDefinition): Options {
  const {
    fileExtension = 'ts',
    componentsFolder = 'components',
    srcFolder = 'src',
    indexFilename = 'index',
    definitionFilename = 'definition',
    definitionName = 'Definition',
    componentNamePrefix = '',
    importsPrefix,
    javaNamespace = 'org.framjet.blastdom.provider'
  } = provider.options ?? {};

  if (!importsPrefix) {
    throw new Error(`ProviderDefinition.options.importsPrefix is missing`);
  }

  return {
    fileExtension,
    componentsFolder,
    srcFolder,
    indexFilename,
    definitionFilename,
    definitionName,
    componentNamePrefix,
    importsPrefix,
    javaNamespace
  };
}

export function providerGenerators(provider: ProviderDefinition): Generators {
  const {
    componentName = (c: ComponentDefinition, o: Options) =>
      c.componentName ?? `${o.componentNamePrefix}${Strings.dotCase(c.name)}`,
    componentFileName = (c: ComponentDefinition, o: Options) =>
      c.fileName ?? `${c.name}.${o.fileExtension}`,
    componentFileNameDirect = (c: ComponentDefinition, o: Options) =>
      c.fileName ?? `${c.name}.direct.${o.fileExtension}`,
    componentFilePath = (f: string, c: ComponentDefinition, o: Options) =>
      c.filePath ?? `${o.srcFolder}/${o.componentsFolder}/${f}`,
    componentImportPath = (c: ComponentDefinition, o: Options) =>
      c.importPath ?? `${o.importsPrefix}${c.name}`,
    componentImportName = (c: ComponentDefinition) =>
      c.importName ?? `${c.name}`,
    componentImportStatement = (
      n: string,
      p: string,
      c: ComponentDefinition
    ) =>
      c.useLazyLoad
        ? undefined
        : c.importStatement ?? `import ${n} from '${p}';`,
    componentCreatorImportStatement = (c: ComponentDefinition) =>
      c.useLazyLoad
        ? `import { createLazyBDomComponent } from 'blastdom';`
        : `import { createBDomComponent } from 'blastdom';`,
    componentExportStatement = (
      i: string,
      ip: string,
      n: string,
      p: string,
      c: ComponentDefinition
    ) =>
      c.useLazyLoad
        ? `export default createLazyBDomComponent(\n` +
        `  () => import('${ip}'),\n  '${n}',\n  ${p},\n);`
        : `export default createBDomComponent(\n  ${i},\n` +
        `  '${n}',\n  ${p},\n);`,
    componentProperties = () => '{}',
    javaProviderName = (o: Options, d: ProviderDefinition) => `${Strings.pascalCase(d.name)}Provider`,
    javaBaseComponentName = (o: Options, d: ProviderDefinition) => `Base${Strings.pascalCase(d.name)}Component`,
    javaComponentName = (n: string, c: ComponentDefinition, o: Options) => c.componentName ?? (`${Strings.pascalCase(`${o.componentNamePrefix}`)}${n}`)
  } = provider.generators ?? {};

  return {
    componentName,
    componentFileName,
    componentFileNameDirect,
    componentFilePath,
    componentImportPath,
    componentImportName,
    componentImportStatement,
    componentCreatorImportStatement,
    componentExportStatement,
    componentProperties,
    javaProviderName,
    javaBaseComponentName,
    javaComponentName
  };
}
