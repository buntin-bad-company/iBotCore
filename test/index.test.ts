import { expect, test, describe } from 'bun:test';

import { Core } from '../src/Core';
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

  const core = new Core(token, clientId);
  const fileBinder = new FileBinder(core);
  const mailNotification = new MailNotification(core);

  core.addDivision(fileBinder);
  core.addDivision(mailNotification);
  
  expect(ifRegister).toBe(true);
  const result = await core.commandRegister();
  expect(result).toBe(void);

  // await core.start();
};

test('index.test.ts', main);
