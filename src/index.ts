import { Core } from './Core';
import { systemFirstRunnerEnvManager } from './utils';
//Divisions
import { FileBinder } from './FileBinder';
import { MailNotification } from './MailNotification';
import { SocialUtility } from './SocialUtility';
import { TodoManager } from './TodoManager';

//packages
import chalk from 'chalk';

export class IBotCore extends Core {
  constructor() {
    const { ifRegister, token, clientId, guildId } = systemFirstRunnerEnvManager();
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
    const todoManager = new TodoManager(this);
    // Edit HERE to add your own divisions
    // this.addDivision(fileBinder);
    // this.addDivision(mailNotification);
    this.addDivision(fileBinder);
    this.addDivision(mailNotification);
    this.addDivision(socialUtility);
    this.addDivision(todoManager);
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
  .then((iBotCore) => {
    iBotCore.log('IBotCore started.');
  })
  .catch((error) => {
    iBotCore.error('Error starting IBotCore:' + error.message);
  });
