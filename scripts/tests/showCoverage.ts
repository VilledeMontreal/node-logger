import { Command, program } from '@caporal/core';
import { ScriptBase } from '@villedemontreal/scripting/dist/src';
import * as path from 'path';
import { configs } from '../../config/configs';

export interface Options {
  report?: string;
}

export class ShowCoverageScript extends ScriptBase<Options> {
  get name(): string {
    return 'show-coverage';
  }

  get description(): string {
    return `Open the tests coverage report.`;
  }

  protected get requiredDependencies(): string[] {
    return ['nyc'];
  }

  protected async configure(command: Command): Promise<void> {
    command.option(`--report <path>`, `The relative path to the coverage report directory.`, {
      default: `output/coverage`,
      validator: program.STRING,
    });
  }

  protected async main() {
    if (process.platform === 'win32') {
      await this.invokeShellCommand('start', ['', this.getReportDir()], {
        useShellOption: true,
      });
    } else {
      await this.invokeShellCommand('open', [this.getReportDir()]);
    }
  }

  protected getReportDir() {
    const projectRoot = `${configs.root}/..`;
    const reportDir = path.resolve(
      projectRoot,
      this.options.report ?? '',
      'lcov-report/index.html'
    );
    return reportDir;
  }
}
