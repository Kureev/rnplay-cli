import path from 'path';

export default () => {
  let config;
  try {
    config = require(path.join(process.cwd(), 'package.json'));
  } catch (e) {
    throw e;
  }

  return config;
};
