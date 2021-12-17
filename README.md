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
import { correlationIdService } from '@villemontreal/core-correlation-id-nodejs-lib';
import {
  createLogger as createLoggerBase,
  ILogger,
  initLogger,
  LoggerConfigs
} from '@villemontreal/core-utils-logger-nodejs-lib';
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

2.  Si c'est une _librairie_ que vous développer (voir [core-nodejs-lib-template](https://bitbucket.org/villemontreal/core-nodejs-lib-template)), vous aurez aussi ce fichier "`src/utils/logger.ts`"
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
le répertoire où les logs autont lieu en utilisant "`setLogDirectory(...)`", qui a la valeur "`./log`" par défaut).

Notez que de logger dans un fichier ne devrait être fait qu'en _local_. Sur les autres environnements, nous utilisong Graylog qui utilise ce qui est écrit _dans la console_ pour ses logs!

## Changer le niveau de log sans redémarrer l'application

```
import { LogLevel } from '@villemontreal/core-utils-general-nodejs-lib';
import { setGlobalLogLevel } from '@villemontreal/core-utils-logger-nodejs-lib';

setGlobalLogLevel(LogLevel.DEBUG);
```

# Builder le projet

**Note**: Sur Linux/Mac assurz-vous que le fichier `run` est exécutable. Autrement, lancez `chmod +x ./run`.

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

Trois "_launch configurations_" sont founies pour déboguer le projet dans VSCode :

- "`Debug all tests`", la launch configuration par défaut. Lance les tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés.

- "`Debug a test file`". Lance _un_ fichier de tests en mode debug. Vous pouvez mettre
  des breakpoints et ils seront respectés. Pour changer le fichier de tests à être exécuté, vous devez modifier la ligne appropriée dans le fichier "`.vscode/launch.json`".

- "`Debug current tests file`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Effectue la compîlation au préalable.

- "`Debug current tests file - fast`". Lance le fichier de tests _présentement ouvert_ dans VSCode en mode debug. Aucune compilation
  n'est effectuée au préalable. Cette launch configuration doit être utilisée lorsque la compilation incrémentale roule (voir la section "`Mode Watch`" plus haut)

## Artifact Nexus privé, lors du développement

Lors du développement d'une nouvelle fonctionnalité, sur une branche `feature`, il peut parfois être
utile de déployer une version temporaire de la librairie dans Nexus. Ceci permet de bien tester
l'utilisation de la librairie modifiée dans un vrai projet, ou même dans une autre librairie
elle-même par la suite utilisée dans un vrai projet.

Si le code à tester est terminé et prêt à être mis en commun avec d'autres développeurs, la solution
de base, comme spécifiée à la section précédante, est de merger sur `develop`: ceci créera
automatiquement un artifact "`-pre-build`" dans Nexus. Cependant, si le code est encore en développement
et vous désirez éviter de polluer la branche commune `develop` avec du code temporaire, il y a une
solution permettant de générer un artifact "`[votre prénom]-pre-build`" temporaire dans Nexus,
à partir d'une branche `feature` directement:

1. Checkoutez votre branche `feature` dans une branche nommée "`nexus`". Ce nom est
   important et correspond à une entrée dans le `Jenkinsfile`.
2. Une fois sur la branche `nexus`, ajoutez un suffixe "`-[votre prénom]`" à
   la version dans le `package.json`, par exemple: "`5.15.0-roger`".
   Ceci permet d'éviter tout conflit dans Nexus et exprime clairement qu'il
   s'agit d'une version temporaire pour votre développement privé.
3. Commitez et poussez la branche `nexus`.
4. Une fois le build Jenkins terminé, un artifact pour votre version aura été
   déployé dans Nexus.

**Notez** que, lors du développement dans une branche `feature`, l'utilisation d'un simple
`npm link` local peut souvent être suffisant! Mais cette solution a ses limites, par exemple si
vous désirez tester la librairie modifiée _dans un container Docker_.

# Aide / Contributions

Pour obtenir de l'aide avec cette librairie, vous pouvez poster sur la salle Google Chat [dev-discussions](https://chat.google.com/room/AAAASmiQveI).

Notez que les contributions sous forme de pull requests sont bienvenues.
