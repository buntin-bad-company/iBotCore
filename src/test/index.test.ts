// import { expect, test } from 'bun:test';

// import { IBotCore } from '../index';
// import { systemFirstRunnerEnvManager } from '../utils';

// const main = async () => {
//   const { ifRegister, token, clientId, guildId } = systemFirstRunnerEnvManager();

//   // TEST RUN FORCES TO BE SET THE ENVIRONMENT VARIABLES

//   expect(ifRegister).toBe(Boolean(ifRegister));
//   expect(token).toBe(String(token));
//   expect(clientId).toBe(String(clientId));
//   if (!token || !clientId || !guildId) {
//     console.log('token', token);
//     console.log('clientId', clientId);
//     console.log('guildId', guildId);
//     throw new Error('Please provide a valid token, client ID, and guild ID.');
//   }
//   const iBotCore = await new IBotCore().start();
//   expect(iBotCore).toBeInstanceOf(IBotCore);
// };

// test('index.test.ts', main);
