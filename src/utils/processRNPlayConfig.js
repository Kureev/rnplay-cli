import cli from 'cli';
import path from 'path';
import getPackageConfig from './getPackageConfig';
import Promise from 'bluebird';

export default () => {
  const config = getPackageConfig().rnplay;

  if (!config) {
    cli.fatal('No rnplay config found. Make sure you have rnplay config in your package.json');
    return false;
  }

  return config;
}
