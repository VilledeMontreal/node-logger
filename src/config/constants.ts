import { path as appRoot } from 'app-root-path';
import * as path from 'path';

/**
 * Library constants
 */
export class Constants {
  /**
   * The library root. When this library is used
   * as a dependency in a project, the "libRoot"
   * will be the path to the dependency folder,
   * inside the "node_modules".
   */
  public libRoot: string;

  /**
   * The app root. When this library is used
   * as a dependency in a project, the "appRoot"
   * will be the path to the root project!
   */
  public appRoot: string;

  constructor() {
    // From the "dist/src/config" folder
    this.libRoot = path.normalize(__dirname + '/../../..');
    this.appRoot = appRoot;
  }

  /**
   * Logging constants
   */
  get logging() {
    return {
      /**
       * The properties that can be added to a log entry.
       */
      properties: {
        /**
         * The type of log. Those types are specified in
         * the following "logType" section.
         */
        LOG_TYPE: 'logType',

        /**
         * The version of the log type.
         */
        LOG_TYPE_VERSION: 'logTypeVersion',

        /**
         * "Nom du composant logiciel"
         */
        APP_NAME: 'app',

        /**
         * "Version du composant logiciel"
         */
        APP_VERSION: 'version',

        /**
         * Correlation id
         */
        CORRELATION_ID: 'cid',
      },

      /**
       * The types of logs
       */
      logType: {
        /**
         * The type for our Ville de Montréal logs.
         */
        MONTREAL: 'mtl',
      },
    };
  }
}

export const constants: Constants = new Constants();
