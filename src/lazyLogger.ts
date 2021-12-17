import { ILogger, LogLevel } from './logger';

/**
 * A Logger wrapper that allows to lazyly create a
 * real Logger.
 *
 * The first time a log is perform, the
 * "loggerCreator" will be called to create
 * the actual Logger.
 */
export class LazyLogger implements ILogger {
  private realLogger: ILogger;
  private name: string;
  private loggerCreator: (name: string) => ILogger;

  constructor(name: string, loggerCreator: (name: string) => ILogger) {
    this.name = name;

    if (!loggerCreator) {
      throw new Error(`The Logger Creator is required!`);
    }
    this.loggerCreator = loggerCreator;
  }

  public debug(messageObj: any, txtMsg?: string): void {
    return this.getRealLogger().debug(messageObj, txtMsg);
  }
  public info(messageObj: any, txtMsg?: string): void {
    return this.getRealLogger().info(messageObj, txtMsg);
  }
  public warning(messageObj: any, txtMsg?: string): void {
    return this.getRealLogger().warning(messageObj, txtMsg);
  }
  public error(messageObj: any, txtMsg?: string): void {
    return this.getRealLogger().error(messageObj, txtMsg);
  }
  public log(level: LogLevel, messageObj: any, txtMsg?: string): void {
    return this.getRealLogger().log(level, messageObj, txtMsg);
  }

  protected getRealLogger(): ILogger {
    if (!this.realLogger) {
      this.realLogger = this.loggerCreator(this.name);
      if (!this.realLogger) {
        throw new Error(`The Logger Creator must create a valid Logger!`);
      }
    }
    return this.realLogger;
  }
}
