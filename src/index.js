#!/usr/bin/env node
'use strict';

/* jshint esnext: true, node:true, unused: true */
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 0;

import cli from 'cli';
import { exec } from 'child_process';
import opener from 'opener';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import {
  maybeUsePackageName,
  readTokenFromCLI,
  readRepoNameFromCLI,
  readEmailFromCLI
} from './utils/input';

import {
  readConfig,
  saveConfig,
  saveLocalConfig,
  readLocalConfig
} from './utils/config';

import createApi from './utils/api';
import processRNPlayConfig from './utils/processRNPlayConfig';

const execAsync = Promise.promisify(exec);
const tmp = os.tmpdir();

const { RNPLAY_ENV } = process.env;
const PREFIX = RNPLAY_ENV ? `${RNPLAY_ENV}.` : '';
const RNPLAY_APP_URL = `https://${PREFIX}rnplay.org/apps/`;
const api = createApi(PREFIX);

/**
 * Returns the key of the first item, which has a truthy value
 * @param  {object} options The cli options
 * @return {string}         The key
 */
const getFirstTrueOption = (options) => {
  return Object.keys(options)
    .reduce((prev, key) => prev ? prev : options[key] && key, null);
};

/**
 * Reads auth token and email from stdin and writes them to the config file
 * @return {Object} A promise
 */
const createConfig = () => {
  return readTokenFromCLI()
    .then((token) => {
      return readEmailFromCLI()
        .then((email) => [token, email]);
    })
    .spread((token, email) => saveConfig({ token, email }))
    .then(() => {
      cli.ok('Saved config to ~/.rnplay');
    });
};

const checkConfig = (conf) => {
  if (!conf.email || !conf.token) {
    throw new Error ('Invalid config, please run `rnplay -a` first');
  }

  return conf;
};

const makeURLToken = (name, config) =>
  api.postCreateRepo(name, config)
    .then(({ body: { url_token } }) => url_token);

const getConfig = () => readConfig().then(checkConfig);

const formatCommand = (urlToken, config) => {
  const remoteName = 'rnplay';
  const url = `https://${config.token}:@git.rnplay.org/${urlToken}.git`;
  return `git remote add ${remoteName} ${url}`;
}

const getAddRemoteCommand = (name) => {
  let config;

  return getConfig()
    .then((c) => config = c)
    .then(() => makeURLToken(name, config))
    .then((token) => formatCommand(token, config));
}

/**
 * Creates a git repo with a name provided by the user and then
 * adds a remove to the local git repo.
 * @return {Object} A promise
 */
const createGitRepo = () => {
  let config;
  return getConfig()
    .then((c) => config = c)
    .then(maybeUsePackageName)
    .then((name) => name ? name : readRepoNameFromCLI())
    .then((name) => makeURLToken(name, config))
    .then((urlToken) => {
      return saveLocalConfig({ urlToken })
        .then(() => urlToken);
    })
    .then((urlToken) => {
      cli.info('Adding git remote');

      const cmd = formatCommand(urlToken, config);

      return execAsync(cmd)
        .then(() => [remoteName, url]);
    })
    .spread((remoteName, url) => {
      cli.ok(`Added remote with name \`${remoteName}\` and url: \`${url}\``);
      cli.ok('All done! Use `git push rnplay master` to push your application.');
      cli.ok('You can use `rnplay --open` to open this application on rnplay.org');
    });
};

/**
 * Opens the current repo in the browser
 * @return {object} A promise
 */
const openAppInBrowser = () => {
  return readLocalConfig()
    .then(({ urlToken }) => {
      if (!urlToken) {
        return cli.error('You have to create an application using `rnplay --create` first');
      }

      const url = RNPLAY_APP_URL + urlToken;
      opener(url);
    });
};

const splitByConfig = () => {
  const dir = path.join(process.cwd());

  return new Promise((resolve, reject) => {
    const config = processRNPlayConfig();
    const folders = Object.keys(config);

    folders.forEach((project, index) => {
      let target = path.join(tmp, project);
      let stat;

      cli.info(`Adding git remote for ${project}`);
      execAsync(`cp -r ${config[project]} ${target}`)
        .then(() =>
          getAddRemoteCommand(project)
            .then((cmd) => exec(`cd ${target} && git init && ${cmd}`)))
        .done(() =>
          index === folders.length - 1 ?
            cli.info(`Done setup for ${target}`) && resolve() :
            cli.info(index + ' of ' + folders.length - 1)
        );
    });
  });
}

const ACTION_MAP = {
  authenticate: createConfig,
  create: createGitRepo,
  open: openAppInBrowser,
  split: splitByConfig,
};

cli.parse({
  authenticate: ['a', 'Authenticate to rnplay.org with a token'],
  create:       ['c', 'Create a git remote for this application'],
  open:         ['o', 'Opens the last created application in rnplay.org'],
  split:        ['s', 'Split repo code by using `rnplay` configuration block in package.json']
});

cli.main((args, options) => {
  const action = ACTION_MAP[getFirstTrueOption(options)];

  if (!action) {
    cli.getUsage();
    return;
  }

  action(cli)
    .catch((e) => {
      cli.error('Ooops, there has been an error: \n' + e.message);
      cli.info('If you are sure that you did nothing wrong, please file an issue at the rnplay-cli repo!');
    })
    .finally(() => process.exit());
});
