import { expect, test } from 'bun:test';

import IBotCore from '../src/index';
import { FileBinder } from '../src/FileBinder';
import { MailNotification } from '../src/MailNotification';
import { systemFirstRunnerEnvManager } from '../src/utils';

const main = async () => {
  const { ifRegister, token, clientId, guildId } =
    systemFirstRunnerEnvManager();

  // TEST RUN FORCES TO BE SET THE ENVIRONMENT VARIABLES

  expect(ifRegister).toBe(Boolean(ifRegister));
  expect(token).toBe(String(token));
  expect(clientId).toBe(String(clientId));
  if (!token || !clientId || !guildId) {
    console.log('token', token);
    console.log('clientId', clientId);
    console.log('guildId', guildId);
    throw new Error('Please provide a valid token, client ID, and guild ID.');
  }
};

test('index.test.ts', main);
