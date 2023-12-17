import { Client, Collection, GatewayIntentBits, ThreadOnlyChannel } from 'discord.js';
import { Division } from './Division';

export class Core extends Client {
  /* 
  Main client
  */
  //現状、Coreで全体で保持しているのはDivisionとコマンド（最初に登録するため。）で、EventはDivision追加時にやることにするが、まだ。
  private divisions = new Collection<string, Division>(); //iBotCoreに登録されているdivisionコレクション
  private commands: Collection<string, Command>; //iBotCore全体のコマンドコレクション
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.commands = new Collection();
    return this;
  }
  private addCommands(newCommands: Command[]): Core {
    const reservedNamePool = new Set(newCommands.map((command) => command.data.name));
    const ifDuplicate = newCommands.every((command) => !reservedNamePool.has(command.data.name));
    if (ifDuplicate) {
      throw new Error('command name duplicated');
    }
    for (const command of newCommands) {
      this.commands.set(command.data.name, command);
    }
    return this;
  }

  public addDivision(div: Division) {
    const newDivName = div.name;
    const reservedNamePool = new Set(this.divisions.map((division) => division.name));
    if (reservedNamePool.has(newDivName)) {
      throw new Error('division name duplicated');
    }
    const key = div.name;
    this.divisions.set(key,div);
    const added = this.divisions.get(key);
    if(!added) {
      throw new Error("??===seems These is that adding division for Core divisions collection is Fail.===??")
    }
    this.addCommands(added.slashCommands);
    //TODO:DivisionのイベントをBotインスタンスに追加する処理。
    return this;
  }

  public async start(token: string) {
    await this.login(token);
    return this;
  }
}

//
/* 
auth_basic "code.buntin.tech";
auth_basic_user_file /etc/nginx/htpasswd.d/code.buntin.tech.htpasswd;
*/
