import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '@villedemontreal/scripting';
import { ITestingGlobalOptions } from './testingGlobalOptions';
import { TestingScript2 } from './testingScript2';

export class TestingScript1 extends ScriptBase<{}, ITestingGlobalOptions> {
  get name(): string {
    // ==========================================
    // A script with a name starting with
    // `TESTING_SCRIPT_NAME_PREFIX` will only be
    // registered/available when tests are run.
    // ==========================================
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScript1`;
  }

  get description(): string {
    return `testingScript1 description`;
  }

  protected async main() {
    this.logger.info(`In testingScript1. custom option: ${this.options.custom}`);
    // ==========================================
    // We do not explicitly pass the `--custom`
    // option to the second script. It should be added
    // automatically since it is a global option.
    // ==========================================
    await this.invokeScript(TestingScript2, {}, {});
  }
}
