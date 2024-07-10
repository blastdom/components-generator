import { cosmiconfig, type CosmiconfigResult } from 'cosmiconfig';
import * as console from 'node:console';
import * as path from 'node:path';
import { providerDefinitionSchema } from './validator';
import chalk from 'chalk';
import { type BaseContext, Builtins, Cli, Command, Option } from 'clipanion';
import type { ProviderDefinition } from './definitions';
import * as fs from 'node:fs';
import { generateComponents } from './generator';
import { generateComponentsJava } from './generator-java';

type Context = BaseContext & {
  cwd: string;
};

abstract class BaseCommand extends Command<Context> {
  cwd = Option.String(`--cwd`, { hidden: true });
  configFile = Option.String(`--config,-c`);
  out = Option.String(`--out,-o`, './out');

  protected getCWD(): string {
    return this.cwd ?? this.context.cwd;
  }

  protected async getConfig(): Promise<ProviderDefinition | false> {
    const explorer = cosmiconfig(
      'blastdom',
      {
        searchPlaces: [
          `blastdom.json`,
          `blastdom.yaml`,
          `blastdom.yml`,
          `blastdom.js`,
          `blastdom.ts`,
          `blastdom.mjs`,
          `blastdom.cjs`
        ]
      }
    );

    let result: CosmiconfigResult | undefined;
    if (this.configFile != null) {
      if (!fs.existsSync(this.configFile)) {
        this.context.stderr.write(chalk.red(`Configuration file "${this.configFile}" not found.\n`));

        return false;
      }

      result = await explorer.load(this.configFile);
    } else {
      result = await explorer.search(this.getCWD());
    }

    if (result == null || result.config == null) {
      this.context.stderr.write(
        chalk.red(
          `No configuration file found. Please ensure that one of the following files exists at ${this.getCWD()}: ` +
          '`blastdom.json`, `blastdom.yaml`, `blastdom.yml`, `blastdom.js`, `blastdom.ts`, `blastdom.mjs`, `blastdom.cjs`.\n'
        )
      );

      return false;
    }

    const config = result.config;
    const validationResult = providerDefinitionSchema(config, 'config');

    if (validationResult.valid) {
      return config;
    }

    this.context.stderr.write(chalk.red(`Error while trying to parse BlastDOM file "${result.filepath}":\n`));
    this.context.stderr.write(chalk.red(`\nErrors:\n`));
    for (const err of validationResult.errors) {
      this.context.stderr.write(chalk.red(` - ${err.message}\n`));
    }

    this.context.stderr.write('\n');

    return false;
  }
}

class GenerateJS extends BaseCommand {
  static paths = [['js']];

  static usage = Command.Usage({
    description: `Generates a Javascript code for components`
  });

  async execute(): Promise<number | void> {
    const config = await this.getConfig();

    if (config === false) {
      return 2;
    }

    const outPath = path.resolve(this.getCWD(), this.out);

    this.context.stdout.write(chalk.green(`Generates a Javascript code for components to: "${outPath}"\n`));

    generateComponents(config, outPath + '/js');

    return Promise.resolve(0);
  }
}

class GenerateJava extends BaseCommand {
  static paths = [['java']];

  static usage = Command.Usage({
    description: `Generates a Java code for components`
  });

  async execute(): Promise<number | void> {
    const config = await this.getConfig();

    if (config === false) {
      return 2;
    }

    const outPath = path.resolve(this.getCWD(), this.out);

    this.context.stdout.write(chalk.green(`Generates a Java code for components to: "${outPath}"\n`));

    generateComponentsJava(config, outPath + '/java');

    return Promise.resolve(0);
  }
}

(async () => {
  const cli = new Cli<Context>({
    binaryName: `components-generator`,
    binaryLabel: `FramJet BlastDOM Components Generator`
  });

  cli.register(Builtins.HelpCommand);
  cli.register(Builtins.VersionCommand);
  cli.register(GenerateJS);
  cli.register(GenerateJava);

  await cli.runExit(process.argv.slice(2), {
    cwd: process.cwd()
  });

})();
