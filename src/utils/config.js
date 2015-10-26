'use strict';

/* jshint esnext: true, node:true, unused: true */

import fs from 'fs';
import path from 'path';
import Promise from 'bluebird';
import expandHomeDir from 'expand-home-dir';

const HOMEDIR = expandHomeDir('~');
const CONFIG_FILE = '.rnplay';
const CONFIG_FILE_PATH = path.join(HOMEDIR, CONFIG_FILE);
const CONFIG_FILE_PATH_LOCAL = path.join(process.cwd(), CONFIG_FILE);

const writeFileAsync = Promise.promisify(fs.writeFile, fs);
const readFileAsync = Promise.promisify(fs.readFile, fs);

const readJSON = (path, msg) => () => {
  return readFileAsync(path)
  .then((contents) => JSON.parse(contents))
  .catch((e) => {
    throw new Error(msg);
  });
};

const writeJSON = (path) => (obj) => {
  return writeFileAsync(path, `${JSON.stringify(obj)}\n`);
};

export const CFG_FILE = CONFIG_FILE;

export const readConfig = readJSON(CONFIG_FILE_PATH, 'Missing or corrupt config file, please run `rnplay -a`');
export const saveConfig = writeJSON(CONFIG_FILE_PATH);

export const saveLocalConfig = writeJSON(CONFIG_FILE_PATH_LOCAL);
export const readLocalConfig = readJSON(CONFIG_FILE_PATH_LOCAL, 'Missing or corrupt local config file, please run `rnplay -c`');
