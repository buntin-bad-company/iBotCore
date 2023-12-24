import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import { Division } from './Division';

export class Core extends Client {
  private coreToken: string;
  private coreClientId: string;
  /* 
  Main client
  */
  //現状、Coreで全体で保持しているのはDivisionとコマンド（最初に登録するため。）で、EventはDivision追加時にやることにするが、まだ。
  private divisions = new Collection<string, Division>(); //iBotCoreに登録されているdivisionコレクション
  private commands: Collection<string, Command>; //iBotCore全体のコマンドコレクション
  constructor(token: string, clientId: string) {
    //TODO:インテンツについても、Divisionから取得し必要最低限（Set）で始めるようにする。
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
    this.coreToken = token;
    this.coreClientId = clientId;
    return this;
  }
  private addCommands(newCommands: Command[]) {
    const reservedNamePool = new Set(
      newCommands.map((command) => command.data.name)
    );
    const ifDuplicate = newCommands.every(
      (command) => !reservedNamePool.has(command.data.name)
    );
    if (ifDuplicate) {
      throw new Error('command name duplicated');
    }
    for (const command of newCommands) {
      this.commands.set(command.data.name, command);
    }
  }
  private addEvents(newEvents: EventSet[]) {
    for (const event of newEvents) {
      if (event.once) {
        this.once(event.event, event.listener);
      } else {
        this.on(event.event, event.listener);
      }
    }
  }
  public addDivision(div: Division) {
    //division追加処理
    const newDivName = div.name;
    const reservedNamePool = new Set(
      this.divisions.map((division) => division.name)
    );
    if (reservedNamePool.has(newDivName)) {
      throw new Error('division name duplicated');
    }
    const key = div.name;
    this.divisions.set(key, div);
    const added = this.divisions.get(key);
    if (!added) {
      throw new Error(
        '??===seems These is that adding division for Core divisions collection is Fail.===??'
      );
    }

    //divisionのcommand,eventを登録
    this.addCommands(added.slashCommands);
    this.addEvents(div.events);
    return this;
  }

  public async commandRegister() {
    try {
      const client = new REST().setToken(this.coreToken);
      const commands: Command[] = Array.from(this.commands.values());
      console.log(
        `Started refreshing ${commands.length} application (/) commands.`
      );
      const data = await client.put(
        Routes.applicationCommands(this.coreClientId),
        {
          body: commands.map((command) => command.data.toJSON()),
        }
      );
      console.log('Successfully reloaded application (/) commands.');
      console.log(data);
    } catch (e) {
      console.error(e);
    }
  }

  private commandHandler: EventSet = {
    name: 'Core::EventHandler',
    once: false,
    event: Events.InteractionCreate,
    listener: async (interaction) => {
      if (!interaction.isCommand()) return;
      const { commandName } = interaction;
      const command = this.commands.get(commandName);
      if (!command) return;
      try {
        command.execute(interaction);
      } catch (error) {
        console.error(error);
        interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      }
    },
  };

  public async start() {
    this.addEvents([this.commandHandler]);
    this.login(this.coreToken);
    return this;
  }
}

//
/* 
auth_basic "code.buntin.tech";
auth_basic_user_file /etc/nginx/htpasswd.d/code.buntin.tech.htpasswd;
*/