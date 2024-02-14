import { Server } from 'bun';
import { join } from 'path';
import { Hono } from 'hono';
import { ChannelType, SlashCommandBuilder } from 'discord.js';
//channel as todo機能
import { Division } from '../Division';
import { Core } from '../Core';
import * as util from '../utils';

type TodoManagerData = {
  webuiPort: number;
  webuiUrlPreset: string;
  todoChannelIds: string[];
};
type TodoEntry = {
  id: string;
  content: string;
};

type TodoChannelPayload = {
  channelId: string;
  channelName: string | undefined;
  entries: TodoEntry[] | undefined;
};

export class TodoManager extends Division {
  private server: Server;
  private dataPath: string;
  constructor(core: Core) {
    super(core);
    const botDataFilename = Bun.env.TODO_MANAGER_BOT_DATA;
    if (!botDataFilename) throw new Error('botData is not set.');
    const dataDir = this.division_data_dir;
    this.dataPath = join(dataDir, botDataFilename);
    const botData = this.data;
    if (botData === undefined) throw new Error('botData is undefined.');
    this.printInfo(`botData: ${botDataFilename} loaded.`);
    this.printInfo('TodoManager webui starting...');
    this.server = Bun.serve({ fetch: this.getHonoFetch(), port: botData.webuiPort });
    this.printInfo(`Bun Server is running on port ${botData.webuiPort}.`);
    this.printInitMessage();
  }

  private getHonoFetch(): typeof Hono.prototype.fetch {
    const app = new Hono();
    app.get('/', (c) => c.text('Hello, Hono & Bun!'));
    return app.fetch;
  }
  get data() {
    const loaded = util.readJsonFile<TodoManagerData>(this.dataPath);
    if (!loaded) {
      const defaultData: TodoManagerData = {
        webuiPort: 3000,
        webuiUrlPreset: '',
        todoChannelIds: [],
      };
      this.data = defaultData;
      const updated = util.readJsonFile<TodoManagerData>(this.dataPath);
      if (!updated) throw new Error('Failed to load data');
      return updated;
    }
    return loaded;
  }
  set data(data: TodoManagerData) {
    util.writeJsonFile(this.dataPath, data);
  }
  private async getTodoContents() {
    const data = this.data;
    const todoChannelIds = data.todoChannelIds;
    const contents: TodoChannelPayload[] = [];
    for (const id of todoChannelIds) {
      const payload: TodoChannelPayload = { channelId: id, channelName: undefined, entries: undefined };
      const channel = this.getChannelById(id);
      if (channel) {
        //channel is not undefined
        if (channel.type === ChannelType.GuildText || channel.type === ChannelType.DM) {
          //channel is supported
          payload.channelName = channel.type === ChannelType.DM ? 'DMChannel' : channel.name;
          const messages = await this.getChannelContents(id);
          if (messages) {
            //message is not undefined
            const entries: TodoEntry[] = [];
            for (const message of messages) {
              entries.push({ id: message.id, content: message.content });
            }
            payload.entries = entries;
          } else {
            //messages is undefined
            this.printError(`Failed to get channel contents. [${id}]`);
          }
        } else {
          //channel is not supported
          this.printError(`Channel is not supported. [${id}]`);
        }
      } else {
        //channel is undefined
        this.printError(`Channel not found. [${id}]`);
      }
      contents.push(payload);
    }
    return contents;
  }
  private addTodoChannelId(id: string) {
    const data = this.data;
    data.todoChannelIds.push(id);
    this.data = data;
  }
  private async getChannelContents(id: string) {
    const channel = await this.core.channels.fetch(id);
    if (!channel) return undefined;
    if (!channel.isTextBased()) {
      this.printError(`Channel is not supported. [${channel.id}]`);
      return undefined;
    }
    return Array.from((await channel.messages.fetch()).values());
  }
  //Division制約 slashCommands get - ():Command[]
  public get slashCommands() {
    const tm_turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('tm_turn_on')
        .setDescription('iBotCore::TodoManager : turn on todo management on this channel.'),
      execute: async (interaction) => {
        const channelId = interaction.channelId;
        const channel = this.getChannelById(channelId);
        if (!channel) {
          this.printError(`Channel not found. [${channelId}]`);
          await interaction.reply('Internal Error occurred. Please contact the administrator.');
          return;
        } else if (!channel.isTextBased()) {
          this.printError(`Channel is not text based. [${channelId}]`);
          await interaction.reply('This channel is not supported.');
          return;
        }
        this.addTodoChannelId(channelId);
        await interaction.reply('Todo management is turned on.');
        const messages = await this.getChannelContents(channelId);
        if (!messages) this.printError(`Failed to get channel contents. [${channelId}]`);
      },
    };
    const tm_test: Command = {
      data: new SlashCommandBuilder().setName('tm_test').setDescription('iBotCore::TodoManager : test command'),
      execute: async (interaction) => {
        const messages = await this.getChannelContents(interaction.channelId);
        if (!messages) {
          this.printError(`Failed to get channel contents. [${interaction.channelId}]`);
          await interaction.reply('Internal Error occurred. Please contact the administrator.');
          return;
        }
        console.log(messages[0]);
        await interaction.reply('test command is called');
      },
    };
    const commands: Command[] = [tm_turn_on, tm_test];
    return commands;
  }
  //Division制約 events get - ():EventSet[]
  public get events() {
    const eventSets: EventSet[] = [];
    return eventSets;
  }
}
