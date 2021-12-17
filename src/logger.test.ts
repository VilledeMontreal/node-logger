import { utils } from '@villedemontreal/general-utils';
import { assert } from 'chai';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import { LoggerConfigs } from './config/configs';
import { constants } from './config/constants';
import { LazyLogger } from './lazyLogger';
import {
  convertLogLevelToPinoNumberLevel,
  createLogger,
  ILogger,
  initLogger,
  Logger,
  LogLevel,
  setGlobalLogLevel
} from './logger';

const TESTING_CID = 'test-cid';

/**
 * The "--no-timeouts" arg doesn't work to disable
 * the Mocha timeouts (while debugging) if a timeout
 * is specified in the code itself. Using this to set the
 * timeouts does.
 */
export function timeout(mocha: Mocha.Suite | Mocha.Context, milliSec: number) {
  mocha.timeout(process.argv.includes('--no-timeouts') ? 0 : milliSec);
}

// ==========================================
// Logger tests
// ==========================================
describe('Logger tests', () => {
  describe('General tests', () => {
    let loggerConfig: LoggerConfigs;
    let logger: ILogger;
    const stdoutWriteBackup = process.stdout.write;
    let output: string;

    before(async () => {
      // ==========================================
      // Tweaks the configs for this tests file.
      // ==========================================
      loggerConfig = new LoggerConfigs(() => TESTING_CID);
      loggerConfig.setLogHumanReadableinConsole(false);
      loggerConfig.setLogSource(true);
      loggerConfig.setLogLevel(LogLevel.INFO);

      // ==========================================
      // Creates the logger
      // ==========================================
      initLogger(loggerConfig, 'default', true);
      logger = new Logger('test');
    });

    let expectTwoCalls = false;
    let keepSecondCallOnly = false;
    let firstCallDone = false;

    function restartCustomWriter() {
      output = '';
      expectTwoCalls = false;
      keepSecondCallOnly = false;
      firstCallDone = false;

      // A stadard "function" is required here, because
      // of the use of "arguments".
      // tslint:disable-next-line:only-arrow-functions
      process.stdout.write = function() {
        if (!expectTwoCalls) {
          output += arguments[0];
          process.stdout.write = stdoutWriteBackup;
          return;
        }

        if (!firstCallDone) {
          if (!keepSecondCallOnly) {
            output += arguments[0];
          }
          firstCallDone = true;
        } else {
          output += arguments[0];
          process.stdout.write = stdoutWriteBackup;
        }
      } as any;

      assert.isTrue(utils.isBlank(output));
    }

    beforeEach(async () => {
      restartCustomWriter();
    });

    it('string message', async () => {
      logger.error('allo');
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.isTrue(_.isObject(jsonObj));
      assert.strictEqual(jsonObj.name, 'test');
      assert.strictEqual(jsonObj.msg, 'allo');
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('string message and extra text message', async () => {
      logger.error('allo', 'salut');
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.isTrue(_.isObject(jsonObj));
      assert.strictEqual(jsonObj.msg, 'allo - salut');
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('custom object message', async () => {
      logger.error({
        key1: {
          key3: 'val3',
          key4: 'val4'
        },
        key2: 'val2',
        msg: 'blabla'
      });
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.key2, 'val2');
      assert.strictEqual(jsonObj.msg, 'blabla');
      assert.deepEqual(jsonObj.key1, {
        key3: 'val3',
        key4: 'val4'
      });
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('custom object message and extra text message', async () => {
      logger.error(
        {
          key1: {
            key3: 'val3',
            key4: 'val4'
          },
          key2: 'val2',
          msg: 'blabla'
        },
        'my text message'
      );

      assert.isTrue(!utils.isBlank(output));
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.key2, 'val2');
      assert.strictEqual(jsonObj.msg, 'blabla - my text message');
      assert.deepEqual(jsonObj.key1, {
        key3: 'val3',
        key4: 'val4'
      });
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('regular Error object and extra text message', async () => {
      logger.error(new Error('my error message'), 'my text message');
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.msg, 'my error message - my text message');
      assert.isTrue(!utils.isBlank(jsonObj.stack));
      assert.isTrue(!utils.isBlank(jsonObj.name));
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('null Error object and extra text message', async () => {
      logger.error(null, 'my text message');
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.msg, 'my text message');
      assert.isTrue(!utils.isBlank(jsonObj.name));
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('undefined Error object and extra text message', async () => {
      logger.error(undefined, 'my text message');
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.msg, 'my text message');
      assert.isTrue(!utils.isBlank(jsonObj.name));
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
      assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
      assert.strictEqual(jsonObj.logTypeVersion, '2');
    });

    it('array message', async () => {
      // ==========================================
      // Two calls to "process.stdout.write" will
      // be made because an error for the invalid
      // array message will be logged!
      // ==========================================
      expectTwoCalls = true;
      keepSecondCallOnly = true;

      logger.error([
        'toto',
        {
          key1: 'val1',
          key2: 'val2'
        }
      ]);

      const jsonObj = JSON.parse(output);
      assert.deepEqual(jsonObj._arrayMsg, [
        'toto',
        {
          key1: 'val1',
          key2: 'val2'
        }
      ]);
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
    });

    it('array message and extra text message', async () => {
      // ==========================================
      // Two calls to "process.stdout.write" will
      // be made because an error for the invalid
      // array message will be logged!
      // ==========================================
      expectTwoCalls = true;
      keepSecondCallOnly = true;

      logger.error(
        [
          'toto',
          {
            key1: 'val1',
            key2: 'val2'
          }
        ],
        'my text message'
      );

      const jsonObj = JSON.parse(output);
      assert.deepEqual(jsonObj._arrayMsg, [
        'toto',
        {
          key1: 'val1',
          key2: 'val2'
        }
      ]);
      assert.strictEqual(jsonObj.msg, 'my text message');
      assert.isNotNull(jsonObj.src);
      assert.isNotNull(jsonObj.src.file);
      assert.isNotNull(jsonObj.src.line);
    });

    it('log level - debug', async () => {
      logger.debug('allo');
      assert.strictEqual(output, '');
    });

    it('log level - info', async () => {
      logger.info('allo');
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.INFO));
    });

    it('log level - warning', async () => {
      logger.warning('allo');
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.WARNING));
    });

    it('log level - error', async () => {
      logger.error('allo');
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.ERROR));
    });

    it('log level - custom valid', async () => {
      logger.log(LogLevel.INFO, 'allo');
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.INFO));
    });

    it('log level - custom invalid', async () => {
      // ==========================================
      // Two calls to "process.stdout.write" will
      // be made because an error for the invalid
      // level will be logged!
      // ==========================================
      expectTwoCalls = true;
      keepSecondCallOnly = true;

      logger.log('nope' as any, 'allo');
      const jsonObj = JSON.parse(output);
      assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.ERROR));
      assert.strictEqual(jsonObj.msg, 'allo');
    });

    it('newline after each log - string', async () => {
      expectTwoCalls = true;

      logger.error('111');
      logger.error('222');

      const pos = output.indexOf('\n');
      assert.isTrue(pos > -1);
      assert.strictEqual(output.charAt(pos + 1), '{');
    });

    it('newline after each log - complexe objects', async () => {
      expectTwoCalls = true;

      logger.error({
        key1: 'val1',
        key2: 'val2'
      });
      logger.error({
        key1: 'val1',
        key2: 'val2'
      });

      const pos = output.indexOf('\n');
      assert.isTrue(pos > -1);
      assert.strictEqual(output.charAt(pos + 1), '{');
    });

    it('date message', async () => {
      const someDate = new Date();
      logger.error(someDate);
      assert.isTrue(!utils.isBlank(output));

      const jsonObj = JSON.parse(output);
      assert.isTrue(_.isObject(jsonObj));
      assert.strictEqual(jsonObj.msg, someDate.toString());
      assert.isTrue(_.isDate(someDate));
    });

    // ==========================================
    // Error controller log messages
    // ==========================================
    describe('Error controller log messages', () => {
      it('app and version properties', async () => {
        const packageJson = require(`${constants.libRoot}/package.json`);
        const appName = packageJson.name;
        const appVersion = packageJson.version;

        logger.error('allo');
        assert.isTrue(!utils.isBlank(output));

        const jsonObj = JSON.parse(output);
        assert.isTrue(_.isObject(jsonObj));
        assert.strictEqual(jsonObj[constants.logging.properties.APP_NAME], appName);
        assert.strictEqual(jsonObj[constants.logging.properties.APP_VERSION], appVersion);
        assert.strictEqual(jsonObj[constants.logging.properties.CORRELATION_ID], TESTING_CID);
      });
    });

    // ==========================================
    // LazyLogger tests
    // ==========================================
    describe('LazyLogger tests', () => {
      let lazyLogger: LazyLogger;

      beforeEach(async () => {
        lazyLogger = new LazyLogger(
          'titi',
          (name: string): ILogger => {
            const logger2 = new Logger('titi');
            return logger2;
          }
        );
      });

      it('debug', async () => {
        lazyLogger.debug('allo');
        assert.isTrue(utils.isBlank(output));
      });

      it('info', async () => {
        lazyLogger.info('allo');

        assert.isTrue(!utils.isBlank(output));
        const jsonObj = JSON.parse(output);
        assert.isTrue(_.isObject(jsonObj));
        assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.INFO));
        assert.strictEqual(jsonObj.name, 'titi');
        assert.strictEqual(jsonObj.msg, 'allo');
        assert.isNotNull(jsonObj.src);
        assert.isNotNull(jsonObj.src.file);
        assert.isNotNull(jsonObj.src.line);
        assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
        assert.strictEqual(jsonObj.logTypeVersion, '2');
        assert.strictEqual(jsonObj[constants.logging.properties.CORRELATION_ID], TESTING_CID);
      });

      it('warning', async () => {
        lazyLogger.warning('allo');

        assert.isTrue(!utils.isBlank(output));
        const jsonObj = JSON.parse(output);
        assert.isTrue(_.isObject(jsonObj));
        assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.WARNING));
        assert.strictEqual(jsonObj.name, 'titi');
        assert.strictEqual(jsonObj.msg, 'allo');
        assert.isNotNull(jsonObj.src);
        assert.isNotNull(jsonObj.src.file);
        assert.isNotNull(jsonObj.src.line);
        assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
        assert.strictEqual(jsonObj.logTypeVersion, '2');
        assert.strictEqual(jsonObj[constants.logging.properties.CORRELATION_ID], TESTING_CID);
      });

      it('error', async () => {
        lazyLogger.error('allo');

        assert.isTrue(!utils.isBlank(output));
        const jsonObj = JSON.parse(output);
        assert.isTrue(_.isObject(jsonObj));
        assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.ERROR));
        assert.strictEqual(jsonObj.name, 'titi');
        assert.strictEqual(jsonObj.msg, 'allo');
        assert.isNotNull(jsonObj.src);
        assert.isNotNull(jsonObj.src.file);
        assert.isNotNull(jsonObj.src.line);
        assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
        assert.strictEqual(jsonObj.logTypeVersion, '2');
        assert.strictEqual(jsonObj[constants.logging.properties.CORRELATION_ID], TESTING_CID);
      });

      it('log', async () => {
        lazyLogger.log(LogLevel.INFO, 'allo');

        assert.isTrue(!utils.isBlank(output));
        const jsonObj = JSON.parse(output);
        assert.isTrue(_.isObject(jsonObj));
        assert.strictEqual(jsonObj.level, convertLogLevelToPinoNumberLevel(LogLevel.INFO));
        assert.strictEqual(jsonObj.name, 'titi');
        assert.strictEqual(jsonObj.msg, 'allo');
        assert.isNotNull(jsonObj.src);
        assert.isNotNull(jsonObj.src.file);
        assert.isNotNull(jsonObj.src.line);
        assert.strictEqual(jsonObj.logType, constants.logging.logType.MONTREAL);
        assert.strictEqual(jsonObj.logTypeVersion, '2');
        assert.strictEqual(jsonObj[constants.logging.properties.CORRELATION_ID], TESTING_CID);
      });

      it('logger creator is required', async () => {
        try {
          const lazyLogger2 = new LazyLogger('titi', null);
          assert.fail();
          assert.isNotOk(lazyLogger2);
        } catch (err) {
          /* ok */
        }

        try {
          const lazyLogger3 = new LazyLogger('titi', undefined);
          assert.fail();
          assert.isNotOk(lazyLogger3);
        } catch (err) {
          /* ok */
        }
      });
    });

    // ==========================================
    // Global log level
    // ==========================================
    describe('Global log level', () => {
      let childLogger: ILogger;
      before(() => {
        childLogger = createLogger('testing child logger');
      });

      afterEach(() => {
        // Reset the default logging
        setGlobalLogLevel(loggerConfig.getLogLevel());
      });

      it('log debug message when global log level set to DEBUG', () => {
        setGlobalLogLevel(LogLevel.DEBUG);

        logger.debug('this is the debug message');
        let jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the debug message');

        restartCustomWriter();
        childLogger.debug('this is the child logger debug message');
        jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the child logger debug message');

        restartCustomWriter();
        logger.info('this is the info message');
        jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the info message');

        restartCustomWriter();
        childLogger.info('this is the child logger  info message');
        jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the child logger  info message');
      });

      it('filter debug message when global log level set to WARNING', () => {
        assert.isTrue(utils.isBlank(output));

        setGlobalLogLevel(LogLevel.WARNING);

        logger.debug('this is my filtered the debug message');
        assert.isTrue(utils.isBlank(output), 'Did not filter debug message as expected.');

        childLogger.debug('this is my filtered the debug message');
        assert.isTrue(utils.isBlank(output), 'Did not filter debug message as expected.');

        logger.info('this is my filtered the info message');
        assert.isTrue(utils.isBlank(output), 'Did not filter info message as expected.');

        childLogger.info('this is my filtered the info message');
        assert.isTrue(utils.isBlank(output), 'Did not filter info message as expected.');

        logger.warning('this is the warning message');
        let jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the warning message');

        restartCustomWriter();
        childLogger.warning('this is the child logger warning message');
        jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the child logger warning message');
      });

      it('apply current log level to new created logger - INFO', () => {
        assert.isTrue(utils.isBlank(output));

        setGlobalLogLevel(LogLevel.WARNING);
        const newLogger = createLogger('testing logger');

        newLogger.info('this is the info message for newly created logger');
        assert.isTrue(utils.isBlank(output), 'Did not filter info message as expected.');

        newLogger.warning('this is the warning message');
        const jsonObj = JSON.parse(output);
        assert.strictEqual(jsonObj.msg, 'this is the warning message');
      });
    });
  });

  describe('Log to file', function() {
    timeout(this, 30000);

    let loggerConfig: LoggerConfigs;
    let logger: ILogger;
    let testingLogDir: string;
    let testingLogFile: string;

    before(async () => {
      testingLogDir = `${constants.libRoot}/output/testingLogs`;
      if (utils.isDir(testingLogDir)) {
        await utils.clearDir(testingLogDir);
      } else {
        fs.mkdirsSync(testingLogDir);
      }

      testingLogFile = `${testingLogDir}/application.log`;
    });

    after(async () => {
      await utils.deleteDir(testingLogDir);
    });

    beforeEach(async () => {
      if (fs.existsSync(testingLogFile)) {
        fs.unlinkSync(testingLogFile);
      }
      assert.isFalse(fs.existsSync(testingLogFile));
    });

    /**
     * Logging with Pino is asynchronous.
     * We need to make sure the log is written to file by waiting.
     * @see https://github.com/pinojs/pino/blob/master/docs/asynchronous.md
     */
    async function logAndWait(msg: string) {
      logger.error(msg);

      assert.isFunction(logger[`pino`][`flush`], `The "flush method should exist on a Pino logger"`);
      logger[`pino`][`flush`]();

      const max = 5000;
      let elapsed = 0;
      const sleep = 200;

      while (!fs.existsSync(testingLogFile) && elapsed < max) {
        await utils.sleep(sleep);
        elapsed += sleep;
      }
    }

    it('No log file - default', async () => {
      loggerConfig = new LoggerConfigs(() => TESTING_CID);
      loggerConfig.setLogHumanReadableinConsole(false);
      loggerConfig.setLogSource(true);
      loggerConfig.setLogLevel(LogLevel.DEBUG);
      loggerConfig.setLogDirectory(testingLogDir);

      initLogger(loggerConfig, 'default', true);
      logger = new Logger('test');

      await logAndWait('allo');
      assert.isFalse(fs.existsSync(testingLogFile));
    });

    it('No log file - explicit', async () => {
      loggerConfig = new LoggerConfigs(() => TESTING_CID);
      loggerConfig.setLogHumanReadableinConsole(false);
      loggerConfig.setLogSource(true);
      loggerConfig.setLogLevel(LogLevel.DEBUG);
      loggerConfig.setLogDirectory(testingLogDir);
      loggerConfig.setSlowerLogToFileToo(false);

      initLogger(loggerConfig, 'default', true);
      logger = new Logger('test');

      await logAndWait('allo');
      assert.isFalse(fs.existsSync(testingLogFile));
    });

    it('Log file', async () => {
      loggerConfig = new LoggerConfigs(() => TESTING_CID);
      loggerConfig.setLogHumanReadableinConsole(false);
      loggerConfig.setLogSource(true);
      loggerConfig.setLogLevel(LogLevel.DEBUG);
      loggerConfig.setLogDirectory(testingLogDir);
      loggerConfig.setSlowerLogToFileToo(true);

      initLogger(loggerConfig, 'default', true);
      logger = new Logger('test');

      await logAndWait('allo');
      assert.isTrue(fs.existsSync(testingLogFile));

      const content = fs.readFileSync(testingLogFile, 'utf-8');
      assert.isOk(content);
      assert.isTrue(content.indexOf(`"msg":"allo"`) > -1);
    });
  });
});
