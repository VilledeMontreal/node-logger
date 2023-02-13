# @villedemontreal/logger

Logger pour applications Node.

Ajoute automatiquement aux logs des informations pertinentes telles que les Correlation Ids, le
nom de l'application, etc.

_Important_ : La configuration `correlationIdProvider` est requise! Votre application
(ou API) _doit_ passer le provider à utiliser...


## Installation

```shell
npm install @villedemontreal/logger
```

## Usage

1.  Nous suggérons de créer, dans votre projet, un fichier "`src/utils/logger.ts`" initialisant la librairie du Logger.
    Puis créer une function exportée `createLogger` que vous utiliserez dans vos divers composants, pour
    créer un Logger associé. Le but de cette indirection est de s'assurer que les Loggers créés sont bien configurés.

```typescript
import { correlationIdService } from '@villedemontreal/correlation-id';
import {
  createLogger as createLoggerBase,
  ILogger,
  initLogger,
  LoggerConfigs
} from '@villedemontreal/logger';
import { configs } from '../../config/configs';

let loggerLibInitialised = false;

function initLoggerConfigs() {
  const loggerConfig: LoggerConfigs = new LoggerConfigs(() => correlationIdService.getId());
  loggerConfig.setLogDirectory(configs.logging.dir);
  loggerConfig.setLogLevel(configs.logging.level);
  loggerConfig.setSlowerLogToFileToo(configs.logging.logToFile);
  loggerConfig.setLogHumanReadableinConsole(configs.logging.humanReadableInConsole);
  loggerConfig.setAddStackTraceToErrorMessagesInDev(configs.logging.addStackTraceToErrorMessagesInDev);
  loggerConfig.setLogSource(configs.logging.logSource);
  loggerConfig.setLogRotateFilesNbr(configs.logging.logRotateFilesNbr);
  loggerConfig.setLogRotateThresholdMB(configs.logging.logRotateThresholdMB);
  loggerConfig.setLogRotateMaxTotalSizeMB(configs.logging.logRotateMaxTotalSizeMB);

  initLogger(loggerConfig);
}

export function createLogger(name: string): ILogger {
  if (!loggerLibInitialised) {
    initLoggerConfigs();
    loggerLibInitialised = true;
  }

  return createLoggerBase(name);
}
```

2.  Si c'est une _librairie_ que vous développez (voir [core-nodejs-lib-template](https://bitbucket.org/villemontreal/core-nodejs-lib-template)), vous aurez aussi ce fichier "`src/utils/logger.ts`"
    mais il ne fera qu'utiliser le "`Logger Creator`" que vous aurez _vous-mêmes_ reçu en configuration! :

```typescript
import { LoggerConfigs, ILogger, Logger, LazyLogger, LogLevel } from '@villemontreal/core-utils-logger-nodejs-lib';
import { configs } from '../config/configs';

export function createLogger(name: string): ILogger {
  return new LazyLogger(name, (name: string) => {
    return configs.loggerCreator(name);
  });
}
```

Notez ici l'utilisation de `LazyLogger` et non de `Logger`... Ceci est requis car votre propre librairie
pourrait ne pas encore avoir été configurée lorsque le premier appel à "_`let logger = createLogger("someName")`_"! Le `LazyLogger` ne va valider les configurations que _lors du premier log_.

## Logger dans un fichier

En appelant "`setSlowerLogToFileToo(true)`", vous faites en sorte que les logs se feront dans un fichier en plus de se faire sur le "stdout" standard (la "console"). Vous pouvez spécifier
le répertoire où les logs auront lieu en utilisant "`setLogDirectory(...)`", qui a la valeur "`./log`" par défaut).

Notez que de logger dans un fichier ne devrait être fait qu'en _local_. Sur les autres environnements, nous utilisons Graylog qui s'appuie sur ce qui est écrit _dans la console_.

## Changer le niveau de log sans redémarrer l'application

```
import { LogLevel } from '@villemontreal/core-utils-general-nodejs-lib';
import { setGlobalLogLevel } from '@villemontreal/core-utils-logger-nodejs-lib';

setGlobalLogLevel(LogLevel.DEBUG);
```

# Construire le projet

**Note**: Sur Linux/Mac assurez-vous que le fichier `run` est exécutable. Autrement, exécutez `chmod +x ./run`.

Pour lancer le build :

- > `run compile` ou `./run compile` (sur Linux/Mac)

Pour lancer les tests :

- > `run test` ou `./run test` (sur Linux/Mac)

# Mode Watch

Lors du développement, il est possible de lancer `run watch` (ou `./run watch` sur Linux/mac) dans un terminal
externe pour démarrer la compilation incrémentale. Il est alors possible de lancer certaines _launch configuration_
comme `Debug current tests file - fast` dans VsCode et ainsi déboguer le fichier de tests présentement ouvert sans
avoir à (re)compiler au préalable (la compilation incrémentale s'en sera chargé).

Notez que, par défaut, des _notifications desktop_ sont activées pour indiquer visuellement si la compilation
incrémentale est un succès ou si une erreur a été trouvée. Vous pouvez désactiver ces notifications en utilisant
`run watch --dn` (`d`isable `n`otifications).

# Déboguer le projet

Trois "_launch configurations_" sont fournies pour déboguer le projet dans VSCode :

- "`Debug all tests`", la launch configuration par défaut. Lance les tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés.

- "`Debug a test file`". Lance _un_ fichier de tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés. Pour changer le fichier de tests à être exécuté, vous devez modifier la ligne appropriée dans le fichier "`.vscode/launch.json`".

- "`Debug current tests file`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Effectue la compîlation au préalable.

- "`Debug current tests file - fast`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Aucune compilation
  n'est effectuée au préalable. Cette launch configuration doit être utilisée lorsque la compilation incrémentale roule (voir la section "`Mode Watch`" plus haut)
