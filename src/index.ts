import { Core } from './Core';
import { FileBinder } from './FileBinder';
import { MailNotification } from './MailNotification';
import { systemFirstRunnerEnvManager } from './utils';
import { SocialUtility } from './SocialUtility';

export class IBotCore extends Core {
  constructor() {
    const { ifRegister, token, clientId, guildId } =
      systemFirstRunnerEnvManager();
    if (!token || !clientId || !guildId) {
      throw new Error('Please provide a valid token, client ID, and guild ID.');
    }
    super(token, clientId);

    // Edit HERE to load your own divisions
    // const fileBinder = new FileBinder(this);
    // const mailNotification = new MailNotification(this);

    const fileBinder = new FileBinder(this);
    const mailNotification = new MailNotification(this);
    const socialUtility = new SocialUtility(this);

    // Edit HERE to add your own divisions
    // this.addDivision(fileBinder);
    // this.addDivision(mailNotification);

    this.addDivision(fileBinder);
    this.addDivision(mailNotification);
    this.addDivision(socialUtility);

    if (ifRegister) {
      this.commandRegister();
    }
  }
  public async start() {
    const constructor = await super.start();
    return constructor;
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
