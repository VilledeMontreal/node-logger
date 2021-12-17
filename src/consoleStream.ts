import { Stream } from 'stream';
const prettyStream = require('bunyan-prettystream-circularsafe');

export class ConsoleStream extends Stream {
  private prettyStdOut: any;
  private isLogHumanReadableinConsole: boolean;

  constructor(isLogHumanReadableinConsole: boolean) {
    super();
    this.isLogHumanReadableinConsole = isLogHumanReadableinConsole;
    this.prettyStdOut = new prettyStream();
    this.prettyStdOut.pipe(process.stdout);
  }

  public write(data: any): void {
    // Using human readable format?
    if (this.isLogHumanReadableinConsole) {
      this.prettyStdOut.write(data);
    } else {
      let dataClean = data;
      if (typeof dataClean !== 'string') {
        dataClean = JSON.stringify(dataClean);
      }
      dataClean += '\n';

      process.stdout.write(dataClean);
    }
  }
}
