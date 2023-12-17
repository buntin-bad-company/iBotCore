import { Core } from './Core';


const token = Bun.env.TOKEN;
const clientId = Bun.env.CLIENT_ID;
const guildId = Bun.env.GUILD_ID;
if (!token || !clientId || !guildId) {
  console.log('token', token);
  console.log('clientId', clientId);
  console.log('guildId', guildId);
  throw new Error('Please provide a valid token, client ID, and guild ID.');
}

const core = new Core();

