import { Core } from './Core';
import { FileBinder } from './FileBinder';
import { MailNotification } from './MailNotification';
import { systemFirstRunnerEnvManager } from './utils';

const { ifRegister, token, clientId, guildId } = systemFirstRunnerEnvManager();

class IBotCore extends Core {
  private static instancd: IBotCore;
  constructor() {
    let logMessage = 'IBotCore:constructor : Initializing';
    if (!token || !clientId || !guildId) {
      console.log('token', token);
      console.log('clientId', clientId);
      console.log('guildId', guildId);
      throw new Error('Please provide a valid token, client ID, and guild ID.');
    }
    super(token, clientId);
    logMessage = this.log(logMessage);
    const core = new Core(token, clientId);
    const fileBinder = new FileBinder(core);
    const mailNotification = new MailNotification(core);

    core.addDivision(fileBinder);
    core.addDivision(mailNotification);

    if (ifRegister) {
      core.commandRegister();
    }
    return this;
  }

  public static getInstance(): IBotCore {
    if (!IBotCore.instance) {
      IBotCore.instancd = new IBotCore();
    }
    return IBotCore.instancd;
  }

  public async start() {
    return super.start();
  }
}
