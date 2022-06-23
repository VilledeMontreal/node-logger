import { ScriptBase, TESTING_SCRIPT_NAME_PREFIX } from '@villedemontreal/scripting';
import { ITestingGlobalOptions } from './testingGlobalOptions';

export class TestingScript2 extends ScriptBase<{}, ITestingGlobalOptions> {
  get name(): string {
    return `${TESTING_SCRIPT_NAME_PREFIX}testingScript1`;
  }

  get description(): string {
    return `testingScript2 description`;
  }

  protected async main() {
    this.logger.info(`In testingScript2. custom option: ${this.options.custom}`);
  }
}
