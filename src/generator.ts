import type {
  ComponentDefinition,
  GeneratorOptions,
  ProviderDefinition,
} from './definitions';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { processOptions, providerGenerators } from './process-options';
import { comp } from './utils';
import chalk from 'chalk';

type CreateFileProps = {
  outDir: string;
  path: string;
  content: string;
  override?: boolean;
};

export function createFile(props: CreateFileProps): void {
  if (fs.existsSync(props.path) && props.override === false) {
    console.warn(
      chalk.yellow(`File "${props.path}" already exist. Skipping because override=false`),
    );
    return;
  }

  const fullPath = path.resolve(props.outDir, props.path);

  const dirName = path.dirname(fullPath);
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  fs.writeFileSync(fullPath, props.content);
}

export function generateComponentFile(
  def: ComponentDefinition,
  go: GeneratorOptions,
): void {
  const pro = go.provider;
  const opts = go.options;
  const gen = go.generators;

  const fileName = gen.componentFileName(def, opts, pro);
  const fileNameDirect = gen.componentFileNameDirect(def, opts, pro);
  const filePath = gen.componentFilePath(fileName, def, opts, pro);
  const filePathDirect = gen.componentFilePath(fileNameDirect, def, opts, pro);

  const componentName = gen.componentName(def, opts, pro);
  const componentProperties = gen.componentProperties(def, opts, pro);

  const importPath = gen.componentImportPath(def, opts, pro);
  const importName = gen.componentImportName(def, opts, pro);
  const importStatement = gen.componentImportStatement(
    importName,
    importPath,
    def,
    opts,
    pro,
  );
  const creatorImport = gen.componentCreatorImportStatement(def, opts, pro);
  const exportStatement = gen.componentExportStatement(
    importName,
    importPath,
    componentName,
    componentProperties,
    def,
    opts,
    pro,
  );

  const lines = [importStatement, creatorImport, '', exportStatement, ''];
  const linesDirect = [
    `import { BDomComponentRegistry } from 'blastdom';`,
    '',
    `BDomComponentRegistry.registerLazy('${componentName}', () => import('./${fileName.replace(`.${opts.fileExtension}`, '')}'));`,
    '',
  ];

  createFile({
    outDir: go.outDir,
    path: filePath,
    content: lines.filter((l) => l !== undefined).join('\n'),
  });

  createFile({
    outDir: go.outDir,
    path: filePathDirect,
    content: linesDirect.filter((l) => l !== undefined).join('\n'),
  });
}

export function generateIndexFile(def: GeneratorOptions): void {
  const lines = [
    `import { BDomComponentRegistry } from 'blastdom';`,
    `import ${def.options.definitionName} from './${def.options.definitionFilename}';`,
    '',
    `BDomComponentRegistry.registerProvider(${def.options.definitionName});`,
    '',
  ];

  createFile({
    outDir: def.outDir,
    path: `${def.options.srcFolder}/${def.options.indexFilename}.${def.options.fileExtension}`,
    content: lines.join('\n'),
  });
}

export function generateDefinitionFile(def: GeneratorOptions): void {
  const filePath =
    `${def.options.srcFolder}/` +
    def.options.definitionFilename +
    `.${def.options.fileExtension}`;

  const gen = def.generators;
  const componentImports = def.components.map((c) => {
    const fileName = gen.componentFileName(c, def.options, def.provider);
    const componentFilePath = gen.componentFilePath(
      fileName,
      c,
      def.options,
      def.provider,
    );
    const componentName = gen.componentName(c, def.options, def.provider);

    const relPath = path
      .relative(path.dirname(filePath), componentFilePath)
      .replace(`.${def.options.fileExtension}`, '');

    return `    '${componentName}': () => import('./${relPath}'),`;
  });

  const lines = [
    `import { BDomComponentProvider } from 'blastdom';`,
    '',
    `export const ${def.options.definitionName}: BDomComponentProvider = {`,
    `  name: ${JSON.stringify(def.provider.name ?? '')},`,
    `  description: ${JSON.stringify(def.provider.description ?? '')},`,
    `  version: ${JSON.stringify(def.provider.version ?? '')},`,
    `  author: ${JSON.stringify(def.provider.author ?? '')},`,
    `  url: ${JSON.stringify(def.provider.url ?? '')},`,
    `  source: ${JSON.stringify(def.provider.source ?? '')},`,
    '  components: {',
    ...componentImports,
    '  },',
    '};',
    '',
    `export default ${def.options.definitionName};`,
    '',
  ];

  createFile({
    outDir: def.outDir,
    path: `${def.options.srcFolder}/${def.options.definitionFilename}.${def.options.fileExtension}`,
    content: lines.join('\n'),
  });
}

export function generateComponents(def: ProviderDefinition, outDir: string): void {
  const generatorOptions: GeneratorOptions = {
    provider: def,
    options: processOptions(def),
    generators: providerGenerators(def),
    components: [],
    outDir,
  };

  generatorOptions.components = (def.components ?? []).map((c) => {
      if (typeof c === 'string') {
        return comp(c)(generatorOptions);
      } else if (typeof c === 'function') {
        return c(generatorOptions);
      } else if (typeof c === 'object') {
        return comp(c)(generatorOptions);
      }

      throw new Error(`Unknown component type ${typeof c}`);
    },
  );

  generatorOptions.components.forEach((c) =>
    generateComponentFile(c, generatorOptions),
  );

  generateDefinitionFile(generatorOptions);
  generateIndexFile(generatorOptions);
}

