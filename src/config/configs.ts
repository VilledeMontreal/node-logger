import { globalConstants } from '@villedemontreal/general-utils';
import { LogLevel } from '../logger';

/**
 * Logger Config
 */
export class LoggerConfigs {
  /**
   * The correlation id provider.
   * To set this is required.
   */
  private correlationIdProvider: () => string = null;

  /**
   * Enable logging to a file.
   * Default to false.
   */
  private logToFile: boolean = false;

  /**
   * The directory where the potential
   * log file will be written.
   * Default to "./log".
   */
  private logDir: string = './log';

  /**
   * Log rotation file nb
   */
  private logRotateFilesNbr: number = 30;

  /**
   * Log rotation threshhold in MB
   */
  private logRotateThresholdMB: number = 100;

  /**
   * Log maximum total size in MB
   */
  private logRotateMaxTotalSizeMB: number = 1000;

  /**
   * Logging level (info, debug, warning, error)
   *
   * Default value : DEBUG in DEV or WARNING otherwise.
   */
  private logLevel: LogLevel =
    process.env.NODE_ENV === globalConstants.Environments.DEV ? LogLevel.DEBUG : LogLevel.WARNING;

  /**
   * Log in human readable form in the console.
   */
  private logHumanReadableinConsole: boolean = false;

  /**
   * Add the stack trace to the error log in development
   */
  private addStackTraceToErrorMessagesInDev: boolean =
    process.env.NODE_ENV === globalConstants.Environments.DEV ? true : false;

  /**
   * Log the source of the error in the log message
   */
  private logSource: boolean = true;

  /**
   * The Correlation Id provider is required.
   */
  constructor(correlationIdProvider: () => string) {
    if (!correlationIdProvider) {
      throw new Error(`The Correlation Id provider is required.`);
    }

    this.correlationIdProvider = correlationIdProvider;
  }

  /**
   * The current Correlation Id.
   */
  get correlationId() {
    return this.correlationIdProvider();
  }

  /**
   * Logging to a file?
   */
  public isLogToFile() {
    return this.logToFile;
  }

  /**
   * Get the directory where the log files should be written
   */
  public getLogDirectory() {
    return this.logDir;
  }

  /**
   * Get the current logging level
   */
  public getLogLevel() {
    return this.logLevel;
  }

  public isLogHumanReadableinConsole() {
    return this.logHumanReadableinConsole;
  }

  public isAddStackTraceToErrorMessagesInDev() {
    return this.addStackTraceToErrorMessagesInDev;
  }

  public isLogSource() {
    return this.logSource;
  }

  public getLogRotateFilesNbr() {
    return this.logRotateFilesNbr;
  }

  public getLogRotateThresholdMB() {
    return this.logRotateThresholdMB;
  }

  public getLogRotateMaxTotalSizeMB() {
    return this.logRotateMaxTotalSizeMB;
  }

  /**
   * Enable logging to a file in addition to
   * logging to the standard output.
   * This should probably be let to FALSE in our
   * current network where Graylog is used : no
   * log files are indeed required!
   */
  public setSlowerLogToFileToo(logToFile: boolean) {
    this.logToFile = logToFile;
  }

  /**
   * Set the directory where the log files should be written
   */
  public setLogDirectory(logDir: string) {
    this.logDir = logDir;
  }

  /**
   * Set the logging level
   */
  public setLogLevel(loglevel: LogLevel) {
    this.logLevel = loglevel;
  }

  /**
   * Set the logs in the console to be human readable
   */
  public setLogHumanReadableinConsole(logHumanReadableinConsole: boolean) {
    this.logHumanReadableinConsole = logHumanReadableinConsole;
  }

  /**
   * Set the stack trace to be logged in development environment
   */
  public setAddStackTraceToErrorMessagesInDev(addStackTraceToErrorMessagesInDev: boolean) {
    this.addStackTraceToErrorMessagesInDev = addStackTraceToErrorMessagesInDev;
  }

  /**
   * Set if the source of the error should be logged
   */
  public setLogSource(logSource: boolean) {
    this.logSource = logSource;
  }

  /**
   * Set the number of log files to rotate
   */
  public setLogRotateFilesNbr(logRotateFilesNb: number) {
    this.logRotateFilesNbr = logRotateFilesNb;
  }

  /**
   * Set the log rotation threshhold.
   */
  public setLogRotateThresholdMB(logRotateThresholdMB: number) {
    this.logRotateThresholdMB = logRotateThresholdMB;
  }

  /**
   * Set the maximum total size of the logfile
   */
  public setLogRotateMaxTotalSizeMB(logRotateMaxTotalSizeMB: number) {
    this.logRotateMaxTotalSizeMB = logRotateMaxTotalSizeMB;
  }
}
