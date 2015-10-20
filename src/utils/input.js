'use strict';

/* jshint esnext: true, node:true */

import cli from 'cli';
import Promise from 'bluebird';
import val from 'validator';
import path from 'path';
import getPackageConfig from './getPackageConfig';

export const withInputAsync = () => {
  return new Promise((resolve, reject) => {
    cli.withInput((line) =>{
      resolve(line);
    });
  });
};

/**
 * Reads a single line, compares it with `predicate`
 * and either outputs and error message and waits for more
 * input or resolves the promise with the valid value
 * @param  {function} predicate The predicate to use for input checking
 * @param  {string} errorMsg    The error message to show
 * @return {object}             A promise
 */
const readLine = (predicate, errorMsg) => {
  return withInputAsync()
    .then((input) => {
      if (!predicate(input)) {
        cli.output(errorMsg);
        return readLine(predicate, errorMsg);
      }

      return input.trim();
    });
};

export const readTokenFromCLI = () => {
  cli.output('Enter your authentication token:');
  return readLine(
    (token) => val.isLength(token, 1),
    'Please enter a valid authentication token'
  );
};

export const readRepoNameFromCLI = () => {
  cli.output('Please enter a name for your git repository (min 5 characters):');
  return readLine(
    (input) => val.isLength(input, 5),
    'Please use a minimum of 5 characters'
  );
};

export const readEmailFromCLI = () => {
  cli.output('Please enter your e-mail address:');
  return readLine(
    (input) => val.isEmail(input),
    'Please use a valid e-mail address'
  );
};

export const maybeUsePackageName = () => {
  let name = getPackageConfig().name;

  if (name) {
    cli.output(`We found the following project name: ${name} - do you want to use it? y/n`);
    return readLine((input) => {
      input = input.trim().toLowerCase();
      return input === 'y' || input === 'n';
    }, 'Please answer with "y" or "n"')
    .then((answer) => answer === 'y' ? name : void 0);
  }
};
