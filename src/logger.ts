import { LogLevel, utils } from '@villedemontreal/general-utils';
import * as fs from 'fs';
import * as http from 'http';
import * as _ from 'lodash';
import * as path from 'path';
import { DestinationStream, StreamEntry, pino } from 'pino';
import * as pretty from 'pino-pretty';
import { LoggerConfigs } from './config/configs';
import { constants } from './config/constants';

const createRotatingFileStream = require('rotating-file-stream').createStream;

// ==========================================
// We export the LogLevel
// ==========================================
export { LogLevel } from '@villedemontreal/general-utils';

// ==========================================
// This allows us to get the *TypeScript*
// informations instead of the ones from the
// transpiled Javascript file.
// ==========================================
require('source-map-support').install({
  environment: 'node',
});

// ==========================================
// App infos
// ==========================================
const packageJson = require(`${constants.appRoot}/package.json`);
const appName = packageJson.name;
const appVersion = packageJson.version;

let loggerInstance: pino.Logger;
let loggerConfigs: LoggerConfigs;
let libIsInited = false;

// Keeping track of all created loggers
const loggerChildren: Logger[] = [];

let multistream: any;

/**
 * A Logger.
 */
export interface ILogger {
  debug(messageObj: any, txtMsg?: string): void;
  info(messageObj: any, txtMsg?: string): void;
  warning(messageObj: any, txtMsg?: string): void;
  error(messageObj: any, txtMsg?: string): void;
  log(level: LogLevel, messageObj: any, txtMsg?: string): void;
}

/**
 * Converts a Pino level to its number value.
 */
export const convertPinoLevelToNumber = (pinoLogLevel: pino.Level): number => {
  return pino.levels.values[pinoLogLevel];
};

/**
 * Converts a local LogLevel to a Pino label level.
 */
export const convertLogLevelToPinoLabelLevel = (logLevel: LogLevel): pino.Level => {
  let pinoLevel: pino.Level = 'error';
  if (logLevel !== undefined) {
    if (logLevel === LogLevel.TRACE) {
      pinoLevel = 'trace';
    } else if (logLevel === LogLevel.DEBUG) {
      pinoLevel = 'debug';
    } else if (logLevel === LogLevel.INFO) {
      pinoLevel = 'info';
    } else if (logLevel === LogLevel.WARNING) {
      pinoLevel = 'warn';
    } else if (logLevel === LogLevel.ERROR) {
      pinoLevel = 'error';
    }
  }
  return pinoLevel;
};

/**
 * Converts a local LogLevel to a Pino number level.
 */
export const convertLogLevelToPinoNumberLevel = (logLevel: LogLevel): number => {
  return convertPinoLevelToNumber(convertLogLevelToPinoLabelLevel(logLevel));
};

/**
 * Gets the path to the directory where to log, if required
 */
const getLogDirPath = (loggerConfig: LoggerConfigs): string => {
  let logDir: string = loggerConfig.getLogDirectory();

  if (!path.isAbsolute(logDir)) {
    logDir = path.join(process.cwd(), logDir);
  }
  logDir = path.normalize(logDir);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  return logDir;
};

/**
 * Initialize the logger with the config given in parameter
 * This function must be used before using createLogger or Logger Class
 * @param {LoggerConfigs} loggerConfig
 * @param {string} [name='default']
 * @param force if `true`, the logger will be initialized
 *   again even if it already is.
 */
export const initLogger = (loggerConfig: LoggerConfigs, name = 'default', force = false) => {
  if (loggerInstance && !force) {
    return;
  }

  const streams: (DestinationStream | StreamEntry)[] = [];
  loggerConfigs = loggerConfig;
  // ==========================================
  // Logs to stdout, potentially in a human friendly
  // format...
  // ==========================================
  if (loggerConfig.isLogHumanReadableinConsole()) {
    streams.push({
      level: convertLogLevelToPinoLabelLevel(loggerConfig.getLogLevel()),
      stream: pretty.default(),
    });
  } else {
    streams.push({
      level: convertLogLevelToPinoLabelLevel(loggerConfig.getLogLevel()),
      stream: process.stdout,
    });
  }

  // ==========================================
  // Logs in a file too?
  // ==========================================
  if (loggerConfig.isLogToFile()) {
    const rotatingFilesStream = createRotatingFileStream('application.log', {
      path: getLogDirPath(loggerConfig),
      size: `${loggerConfig.getLogRotateThresholdMB()}M`,
      maxSize: `${loggerConfig.getLogRotateMaxTotalSizeMB()}M`,
      maxFiles: loggerConfig.getLogRotateFilesNbr(),
    });

    // ==========================================
    // TODO
    // Temp console logs, to help debug this issue:
    // https://github.com/iccicci/rotating-file-stream/issues/17#issuecomment-384423230
    // ==========================================
    rotatingFilesStream.on('error', (err: any) => {
      // tslint:disable-next-line:no-console
      console.log('Rotating File Stream error: ', err);
    });
    rotatingFilesStream.on('warning', (err: any) => {
      // tslint:disable-next-line:no-console
      console.log('Rotating File Stream warning: ', err);
    });

    streams.push({
      level: convertLogLevelToPinoLabelLevel(loggerConfig.getLogLevel()),
      stream: rotatingFilesStream,
    });
  }

  multistream = pino.multistream(streams);
  loggerInstance = pino(
    {
      name,
      safe: true,
      timestamp: pino.stdTimeFunctions.isoTime, // ISO-8601 timestamps
      messageKey: 'msg',
      level: convertLogLevelToPinoLabelLevel(loggerConfig.getLogLevel()),
    },
    multistream
  );

  libIsInited = true;
};

/**
 * Change the global log level of the application. Useful to change dynamically
 * the log level of something that is already started.
 * @param level The log level to set for the application
 */
export const setGlobalLogLevel = (level: LogLevel) => {
  if (!loggerInstance) {
    throw new Error(
      'You must use "initLogger" function in @villedemontreal/logger package before making new instance of Logger.'
    );
  }
  // Change the log level and update children accordingly
  loggerInstance.level = convertLogLevelToPinoLabelLevel(level);
  for (const logger of loggerChildren) {
    logger.update();
  }

  // ==========================================
  // The streams's levels need to be modified too.
  // ==========================================
  if (multistream && multistream.streams) {
    for (const stream of multistream.streams) {
      // We need to use the *numerical* level value here
      stream.level = convertLogLevelToPinoNumberLevel(level);
    }
  }
};

/**
 * Shorthands function that return a new logger instance
 * Internally, we use the same logger instance but with different context like the name given in parameter
 * and this context is kept in this new instance returned.
 * @export
 * @param {string} name
 * @returns {ILogger}
 */
export function createLogger(name: string): ILogger {
  return new Logger(name);
}

export function isInited(): boolean {
  return libIsInited;
}

/**
 * Logger implementation.
 */
export class Logger implements ILogger {
  private readonly pino: pino.Logger;

  /**
   * Creates a logger.
   *
   * @param the logger name. This name should be related
   * to the file the logger is created in. On a production
   * environment, it's possible that only this name will
   * be available to locate the source of the log.
   * Streams will be created after the first call to the logger
   */
  constructor(name: string) {
    if (!loggerInstance) {
      throw new Error(
        'You must use "initLogger" function in @villedemontreal/logger package before making new instance of Logger.'
      );
    }
    this.pino = loggerInstance.child({ name });
    loggerChildren.push(this);
  }

  /**
   * Logs a DEBUG level message object.
   *
   * If the extra "txtMsg" parameter is set, it is
   * going to be  added to messageObj as a ".msg"
   * property (if messageObj is an object) or
   * concatenated to messageObj (if it's not an
   * object).
   *
   * Those types of logs are possible :
   *
   * - log.debug("a simple text message");
   * - log.debug({"name": "an object"});
   * - log.debug({"name": "an object..."}, "... and an extra text message");
   * - log.debug(err, "a catched error and an explanation message");
   */
  public debug(messageObj: any, txtMsg?: string) {
    this.log(LogLevel.DEBUG, messageObj, txtMsg);
  }

  /**
   * Logs an INFO level message.
   *
   * If the extra "txtMsg" parameter is set, it is
   * going to be  added to messageObj as a ".msg"
   * property (if messageObj is an object) or
   * concatenated to messageObj (if it's not an
   * object).
   *
   * Those types of logs are possible :
   *
   * - log.info("a simple text message");
   * - log.info({"name": "an object"});
   * - log.info({"name": "an object..."}, "... and an extra text message");
   * - log.info(err, "a catched error and an explanation message");public
   */
  public info(messageObj: any, txtMsg?: string) {
    this.log(LogLevel.INFO, messageObj, txtMsg);
  }

  /**
   * Logs a WARNING level message.
   *
   * If the extra "txtMsg" parameter is set, it is
   * going to be  added to messageObj as a ".msg"
   * property (if messageObj is an object) or
   * concatenated to messageObj (if it's not an
   * object).
   *
   * Those types of logs are possible :
   *
   * - log.warning("a simple text message");
   * - log.warning({"name": "an object"});
   * - log.warning({"name": "an object..."}, "... and an extra text message");
   * - log.warning(err, "a catched error and an explanation mespublic sage");
   */
  public warning(messageObj: any, txtMsg?: string) {
    this.log(LogLevel.WARNING, messageObj, txtMsg);
  }

  /**
   * Logs an ERROR level message.
   *
   * If the extra "txtMsg" parameter is set, it is
   * going to be  added to messageObj as a ".msg"
   * property (if messageObj is an object) or
   * concatenated to messageObj (if it's not an
   * object).
   *
   * Those types of logs are possible :
   *
   * - log.error("a simple text message");
   * - log.error({"name": "an object"});
   * - log.error({"name": "an object..."}, "... and an extra text message");
   * - log.error(err, "a catched error and an explanatpublic ion message");
   */
  public error(messageObj: any, txtMsg?: string) {
    this.log(LogLevel.ERROR, messageObj, txtMsg);
  }

  /**
   * Logs a level specific message.
   *
   * If the extra "txtMsg" parameter is set, it is
   * going to be added to messageObj as a ".msg"
   * property (if messageObj is an object) or
   * concatenated to messageObj (if it's not an
   * object).
   *
   * Those types of logs are possible :
   *
   * - log(LogLevel.XXXXX, "a simple text message");
   * - log({"name": "an object"});
   * - log({"name": "an object..."}, "... and an extra text message");
   * - log(err, "a catched error and an epublic xplanation message");
   */
  // tslint:disable-next-line:cyclomatic-complexity
  public log(level: LogLevel, messageObj: any, txtMsg?: string) {
    let messageObjClean = messageObj;
    const txtMsgClean = txtMsg;

    if (messageObjClean === null || messageObjClean === undefined) {
      messageObjClean = {};
    } else if (_.isArray(messageObjClean)) {
      try {
        loggerInstance.error(
          `The message object to log can't be an array. An object will be used instead and` +
            `the content of the array will be moved to an "_arrayMsg" property on it : ${messageObjClean}`
        );
      } catch (err) {
        // too bad
      }
      messageObjClean = {
        _arrayMsg: _.cloneDeep(messageObjClean),
      };
    }

    if (utils.isObjectStrict(messageObjClean)) {
      // ==========================================
      // The underlying logger may ignore all fields
      // except "message" if
      // the message object is an instance of the
      // native "Error" class. But we may want to use
      // that Error class to log more fields. For example :
      //
      // let error: any = new Error("my message");
      // error.customKey1 = "value1";
      // error.customKey2 = "value2";
      // throw error;
      //
      // This is useful if we need a *stackTrace*, which
      // the Error class allows.
      //
      // This is why we create a plain object from that Error
      // object.
      // ==========================================
      if (messageObjClean instanceof Error) {
        const messageObjNew: any = {};
        messageObjNew.name = messageObj.name;
        messageObjNew.msg = messageObj.message;
        messageObjNew.stack = messageObj.stack;

        // Some extra custom properties?
        messageObjClean = _.assignIn(messageObjNew, messageObj);
      } else if (messageObjClean instanceof http.IncomingMessage && messageObjClean.socket) {
        // ==========================================
        // This is a weird case!
        // When logging an Express Request, Pino transforms
        // it first: https://github.com/pinojs/pino-std-serializers/blob/master/lib/req.js#L65
        // But doing so it accesses the `connection.remoteAddress` prpperty
        // and, in some contexts, the simple fact to access this property
        // throws an error:
        // "TypeError: Illegal invocation\n    at Socket._getpeername (net.js:712:30)"
        //
        // The workaround is to access this property in a try/catch
        // and, if an error occures, force its value to
        // a simple string.
        // ==========================================
        messageObjClean = _.cloneDeep(messageObjClean);
        try {
          // tslint:disable-next-line:no-unused-expression
          messageObjClean.socket.remoteAddress;
        } catch (err) {
          messageObjClean.socket = {
            ...messageObjClean.socket,
            remoteAddress: '[not available]',
          };
        }
      } else {
        messageObjClean = _.cloneDeep(messageObjClean);
      }

      // ==========================================
      // Pino will always use the "msg" preoperty of
      // the object if it exists, even if we pass a
      // second parameter consisting in the message.
      // ==========================================
      if (txtMsgClean) {
        messageObjClean.msg =
          (messageObjClean.msg ? `${messageObjClean.msg} - ` : '') + txtMsgClean;
      }
    } else {
      const suffix = txtMsgClean ? ` - ${txtMsgClean}` : '';
      messageObjClean = {
        msg: `${messageObjClean}${suffix}`,
      };
    }

    if (level === LogLevel.DEBUG) {
      this.pino.debug(this.enhanceLog(messageObjClean));
    } else if (level === LogLevel.INFO) {
      this.pino.info(this.enhanceLog(messageObjClean));
    } else if (level === LogLevel.WARNING) {
      this.pino.warn(this.enhanceLog(messageObjClean));
    } else if (level === LogLevel.ERROR) {
      this.pino.error(this.enhanceLog(messageObjClean));
    } else {
      try {
        loggerInstance.error(`UNMANAGED LEVEL "${level}"`);
      } catch (err) {
        // too bad
      }

      this.pino.error(this.enhanceLog(messageObjClean));
    }
  }

  /**
   * Update the logger based on the parent changes.
   * Could use something more precise to handle specific event but
   * people could use it to update the child independently from the parent,
   * which is not what is intended.
   */
  public update() {
    // Set new level
    this.pino.level = loggerInstance.level;
  }

  /**
   * Adds the file and line number where the log occures.
   * This particular code is required since our custom Logger
   * is a layer over Pino and therefore adds an extra level
   * to the error stack. Without this code, the file and line number
   * are not the right ones.
   *
   * Based by http://stackoverflow.com/a/38197778/843699
   */
  private enhanceLog(messageObj: any) {
    // ==========================================
    // Adds a property to indicate this is a
    // Montreal type of log entry.
    //
    // TODO validate this + adds standardized
    // properties.
    // ==========================================
    if (!(constants.logging.properties.LOG_TYPE in messageObj)) {
      messageObj[constants.logging.properties.LOG_TYPE] = constants.logging.logType.MONTREAL;

      // ==========================================
      // TO UPDATE when the properties added to the
      // log change!
      //
      // 1 : first version with Bunyan
      // 2 : With Pino
      // ==========================================
      messageObj[constants.logging.properties.LOG_TYPE_VERSION] = '2';
    }

    // ==========================================
    // cid : correlation id
    // ==========================================
    const cid = loggerConfigs.correlationId;
    if (cid) {
      messageObj[constants.logging.properties.CORRELATION_ID] = cid;
    }

    // ==========================================
    // "app" and "version"
    // @see https://sticonfluence.interne.montreal.ca/pages/viewpage.action?pageId=43530740
    // ==========================================
    messageObj[constants.logging.properties.APP_NAME] = appName;
    messageObj[constants.logging.properties.APP_VERSION] = appVersion;

    if (!loggerConfigs.isLogSource()) {
      return messageObj;
    }

    let stackLine;
    const stackLines = new Error().stack.split('\n');
    stackLines.shift();
    for (const stackLineTry of stackLines) {
      if (stackLineTry.indexOf(`at ${(Logger as any).name}.`) <= 0) {
        stackLine = stackLineTry;
        break;
      }
    }
    if (!stackLine) {
      return messageObj;
    }

    let callerLine = '';
    if (stackLine.indexOf(')') >= 0) {
      callerLine = stackLine.slice(stackLine.lastIndexOf('/'), stackLine.lastIndexOf(')'));
      if (callerLine.length === 0) {
        callerLine = stackLine.slice(stackLine.lastIndexOf('('), stackLine.lastIndexOf(')'));
      }
    } else {
      callerLine = stackLine.slice(stackLine.lastIndexOf('at ') + 2);
    }

    const firstCommaPos = callerLine.lastIndexOf(':', callerLine.lastIndexOf(':') - 1);
    const filename = callerLine.slice(1, firstCommaPos);
    const lineNo = callerLine.slice(firstCommaPos + 1, callerLine.indexOf(':', firstCommaPos + 1));

    messageObj.src = {
      file: filename,
      line: lineNo,
    };

    return messageObj;
  }
}
