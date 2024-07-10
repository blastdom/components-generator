import type {
  ComponentDefinition,
  GeneratorOptions,
  ProviderDefinition,
} from './definitions';
import { processOptions, providerGenerators } from './process-options';
import { comp } from './utils';
import { createFile } from './generator';
import { Strings } from '@framjet/common';


export function generateComponentFileJava(
  def: ComponentDefinition,
  go: GeneratorOptions,
): void {
  const pro = go.provider;
  const opts = go.options;
  const gen = go.generators;

  const componentName = gen.componentName(def, opts, pro);
  const componentNameJava = gen.javaComponentName(Strings.pascalCase(def.name), def, opts, pro);
  const baseName = gen.javaBaseComponentName(opts, pro);

  const lines = [
    `package ${opts.javaNamespace}.components;`,
    ``,
    `import org.jetbrains.annotations.NotNull;`,
    ``,
    `public class ${componentNameJava} extends ${baseName}<${componentNameJava}> {`,
    ``,
    `  @Override`,
    `  protected @NotNull String getComponentName() {`,
    `    return "${componentName}";`,
    `  }`,
    ``,
    `  @Override`,
    `  protected @NotNull ${componentNameJava} self() {`,
    `    return this;`,
    `  }`,
    ``,
    `  @Override`,
    `  protected @NotNull ${componentNameJava} newCopyInstance() {`,
    `    return new ${componentNameJava}();`,
    `  }`,
    `}`,
  ];

  createFile({
    outDir: go.outDir,
    path: `${opts.srcFolder}/main/java/${opts.javaNamespace.replaceAll('.', '/')}/components/${componentNameJava}.java`,
    content: lines.filter((l) => l !== undefined).join('\n'),
  });
}

export function generateJavaBaseComponentFile(def: GeneratorOptions): void {
  const name = def.generators.javaBaseComponentName(def.options, def.provider);

  const lines = [
    `package ${def.options.javaNamespace}.components;`,
    ``,
    `import org.framjet.blastdom.builder.nodes.BaseComponentNode;`,
    `import org.framjet.blastdom.builder.values.StaticValue;`,
    `import org.jetbrains.annotations.NotNull;`,
    ``,
    `public abstract class ${name}<T extends ${name}<T>>`,
    `  extends BaseComponentNode<T> {`,
    ``,
    `  protected ${name}() {`,
    `    super();`,
    ``,
    `    this.attributes.put("name", new StaticValue<>(getComponentName()));`,
    `  }`,
    ``,
    `  protected abstract @NotNull String getComponentName();`,
    `}`,
    ``,

  ];

  createFile({
    outDir: def.outDir,
    path: `${def.options.srcFolder}/main/java/${def.options.javaNamespace.replaceAll('.', '/')}/components/${name}.java`,
    content: lines.join('\n'),
  });
}

export function generateJavaProviderFile(def: GeneratorOptions): void {
  const name = def.generators.javaProviderName(def.options, def.provider);

  const gen = def.generators;
  const componentImports = def.components.map((c) => {
    const componentNameJava = gen.javaComponentName(Strings.pascalCase(c.name), c, def.options, def.provider);

    return `import ${def.options.javaNamespace}.components.${componentNameJava};`;
  });
  const componentRegister = def.components.map((c) => {
    const componentName = gen.componentName(c, def.options, def.provider);
    const componentNameJava = gen.javaComponentName(Strings.pascalCase(c.name), c, def.options, def.provider);

    return `    registry.registerComponent("${componentName}", ${componentNameJava}.class);`;
  });

  const lines = [
    `package ${def.options.javaNamespace};`,
    ``,
    `import org.framjet.blastdom.BlastDOMRegistry;`,
    ...componentImports,
    `import org.framjet.blastdom.domain.BlastDOMItemProvider;`,
    `import org.jetbrains.annotations.NotNull;`,
    ``,
    `public class ${name} implements BlastDOMItemProvider {`,
    ``,
    `  @Override`,
    `  public void registerBlastDOMItems(@NotNull BlastDOMRegistry registry) {`,
    ...componentRegister,
    `  }`,
    `}`,
  ];

  createFile({
    outDir: def.outDir,
    path: `${def.options.srcFolder}/main/java/${def.options.javaNamespace.replaceAll('.', '/')}/${name}.java`,
    content: lines.join('\n'),
  });
}

export function generateProviderServiceFileJava(def: GeneratorOptions): void {
  const name = def.generators.javaProviderName(def.options, def.provider);

  createFile({
    outDir: def.outDir,
    path: `${def.options.srcFolder}/main/resources/META-INF/services/org.framjet.blastdom.domain.BlastDOMItemProvider`,
    content: `${def.options.javaNamespace}.${name}`,
  });
}

export function generateComponentsJava(def: ProviderDefinition, outDir: string): void {
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
    generateComponentFileJava(c, generatorOptions),
  );

  generateJavaProviderFile(generatorOptions);
  generateJavaBaseComponentFile(generatorOptions);
  generateProviderServiceFileJava(generatorOptions);
}
