import { Core } from './Core';
import { FileBinder } from './FileBinder';

const argv = Bun.argv;

const ifRegister = argv.includes('--register') || argv.includes('-r');
const token = Bun.env.TOKEN;
const clientId = Bun.env.CLIENT_ID;
const guildId = Bun.env.GUILD_ID;
if (!token || !clientId || !guildId) {
  console.log('token', token);
  console.log('clientId', clientId);
  console.log('guildId', guildId);
  throw new Error('Please provide a valid token, client ID, and guild ID.');
}

const core = new Core(token,clientId);
const fileBinder = new FileBinder(core);

core.addDivision(fileBinder);


if(ifRegister) {
  core.commandRegister();
}

core.start();


