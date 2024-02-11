import {
  Awaitable,
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  REST,
  Routes,
} from 'discord.js';
import { Division } from './Division';
import { now } from './utils';
export class Core extends Client {
  /*
  Client (https://discord.js.org/docs/packages/discord.js/main/Client:Class) 
  */
  public static instance: Core;
  public coreToken: string;
  public coreClientId: string;
  /* 
  Main client
  */
  public divisions = new Collection<string, Division>(); //iBotCoreに登録されているdivisionコレクション
  protected commands: Collection<string, Command>; //iBotCore全体のコマンドコレクション
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
    this.coreToken = token;
    this.coreClientId = clientId;
    this.commands = new Collection();
    this.divisions = new Collection();
  }

  public getCore() {
    if (!Core.instance) {
      Core.getInstance(this.coreToken, this.coreClientId);
      if (!Core.instance) throw new Error('[ERROR]Core:getCore => Core is not initialized');
    }
    return Core.instance;
  }

  private static getInstance(token: string, clientId: string): Core {
    if (!Core.instance) {
      Core.instance = new Core(token, clientId);
    }
    return Core.instance;
  }
  protected addCommands(newCommands: Command[]) {
    const reservedNamePool = new Set(this.commands.map((command) => command.data.name));
    const duplicatedCommands = newCommands.filter((command) => reservedNamePool.has(command.data.name));
    if (duplicatedCommands.length !== 0) {
      throw new Error('command name duplicated' + duplicatedCommands.map((command) => command.data.name).join(','));
    }
    for (const command of newCommands) {
      this.commands.set(command.data.name, command);
    }
  }
  protected addEvents(newEventSets: EventSet[]) {
    for (const eventSet of newEventSets) {
      const { event, listener, once } = eventSet;
      if (once) {
        this.once(event, listener as (...args: any[]) => Awaitable<void>);
      } else {
        this.on(event, listener as (...args: any[]) => Awaitable<void>);
      }
    }
  }
  public addDivision(div: Division) {
    //division追加処理
    const newDivName = div.name;
    const reservedNamePool = new Set(this.divisions.map((division) => division.name));
    if (reservedNamePool.has(newDivName)) {
      throw new Error('division name duplicated');
    }
    const key = div.name;
    this.divisions.set(key, div);
    const added = this.divisions.get(key);
    if (!added) {
      throw new Error('??===seems These is that adding division for Core divisions collection is Fail.===??');
    }

    //divisionのcommand,eventを登録
    this.addCommands(added.slashCommands);
    this.addEvents(div.events);
    return this;
  }

  public log(message: string) {
    let msg = `[${now()}] Core => ${message}`;
    if (message.startsWith('\n')) {
      msg = message.slice(1);
    }
    console.log(msg);
    return msg;
  }
  public error(message: string) {
    const msg = `[${now()}] iBotCore::Core => ${message}`;
    console.error(msg);
    return msg;
  }
  public async commandRegister() {
    try {
      const client = new REST().setToken(this.coreToken);
      const commands: Command[] = Array.from(this.commands.values());
      this.log(`Started refreshing ${commands.length} application (/) commands.`);
      const data = await client.put(Routes.applicationCommands(this.coreClientId), {
        body: commands.map((command) => command.data.toJSON()),
      });
      this.log('Successfully reloaded application (/) commands.');
    } catch (e) {
      this.error(e as string);
    }
  }
  //CoreEvents
  protected commandHandler: EventSet = {
    name: 'Core::CommandHandler',
    once: false,
    event: Events.InteractionCreate,
    listener: async (interaction: Interaction) => {
      if (!interaction.isCommand()) return;
      const { commandName } = interaction;
      this.log('iBotCore::Core:CommandHandler->' + commandName + ' is called');
      const command = this.commands.get(commandName);
      if (!command) {
        this.error('iBotCore::Core:CommandHandler->' + commandName + ' is not found');
        return;
      }
      try {
        await command.execute(interaction);
        this.log('iBotCore::Core:EventHandler->' + commandName + ' is done');
      } catch (error) {
        this.error(error as string);
        interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true,
        });
      }
    },
  };

  protected get initEventSet(): EventSet {
    return {
      name: 'Core::Ready',
      once: true,
      event: Events.ClientReady,
      listener: async () => {
        this.log(chalk.green(`Logged in as ${this.user?.tag}!`));
      },
    };
  }

  protected filteredChannels(ids: string[]) {
    const channels = Array.from(this.channels.cache.values());
    const textChannels = channels.filter((channel) => channel.type === ChannelType.GuildText);
    const filteredChannels = textChannels.filter((channel) => {
      return ids.includes(channel.id);
    });
    return filteredChannels;
  }

  public async start() {
    this.addEvents([this.commandHandler, this.initEventSet]);
    const loginResult = await this.login(this.coreToken);
    return this;
  }
}
