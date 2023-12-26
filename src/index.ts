import { Core } from './Core';
import { FileBinder } from './FileBinder';
import { MailNotification } from './MailNotification';
import { systemFirstRunnerEnvManager } from './utils';

class IBotCore extends Core {
  constructor() {
    const { ifRegister, token, clientId, guildId } =
      systemFirstRunnerEnvManager();
    if (!token || !clientId || !guildId) {
      throw new Error('Please provide a valid token, client ID, and guild ID.');
    }
    super(token, clientId);

    // Edit HERE to add your own divisions
    // const fileBinder = new FileBinder(this);
    // const mailNotification = new MailNotification(this);
    // this.addDivision(fileBinder);
    // this.addDivision(mailNotification);
    const fileBinder = new FileBinder(this);
    const mailNotification = new MailNotification(this);
    this.addDivision(fileBinder);
    this.addDivision(mailNotification);

    if (ifRegister) {
      this.commandRegister();
    }
  }

  public async start() {
    return super.start();
  }
}

// IBotCoreインスタンスの生成と開始
const iBotCore = new IBotCore();
iBotCore
  .start()
  .then(() => {
    console.log('IBotCore started');
  })
  .catch((error) => {
    console.error('Error starting IBotCore:', error);
  });

export default iBotCore;
