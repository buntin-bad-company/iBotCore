import fs from 'node:fs';
import { join } from 'path';
import { Events, Message, SlashCommandBuilder } from 'discord.js';

import { Division } from '../Division';
import { Core } from '../Core';
import { FBBotData, Attachments } from './types';
import * as util from '../utils';

export class FileBinder extends Division {
  private bindingDirPath: string;
  private fileBinderDivDataPath: string;
  private urlPreset: string;
  constructor(core: Core) {
    super(core);
    const dataDir = Bun.env.FILE_BINDER_DATA_DIR;
    const botData = Bun.env.FILE_BINDER_BOT_DATA;
    const urlPreset = Bun.env.FILE_BINDER_URL_PRESET;
    if (!dataDir || !botData || !urlPreset) {
      throw new Error('dataDir or botData or urlPreset is not set.');
    }
    this.urlPreset = urlPreset;
    this.bindingDirPath = join(this.division_data_dir, dataDir);
    if (!fs.existsSync(this.bindingDirPath)) {
      throw new Error(`Please provide a valid data directory. [${this.bindingDirPath}]`);
    } else {
      this.printInfo(`Binding Data Dir exists: ${this.bindingDirPath}`);
    }
    this.fileBinderDivDataPath = join(this.division_data_dir, botData);
    if (this.data === undefined) {
      throw new Error('botData is undefined.');
    } else {
      this.printInfo(`Bot data file exists: ${this.fileBinderDivDataPath}`);
    }
    this.printInitMessage();
  }
  private get data() {
    const data = util.readJsonFile<FBBotData>(this.fileBinderDivDataPath);
    if (!data) {
      util.writeJsonFile(this.fileBinderDivDataPath, { monitors: [] });
      const buffer = util.readJsonFile<FBBotData>(this.fileBinderDivDataPath);
      if (Bun.deepEquals(buffer, { monitors: [] })) {
        this.printInfo('FileBinder::BotData is initialized.');
        return buffer!;
      } else {
        throw new Error('FileBinder::BotData cannot initialize.');
      }
    }
    return data;
  }
  private saveData(data: FBBotData) {
    util.writeJsonFile(this.fileBinderDivDataPath, data);
  }
  private checkChannelId(channelId: string) {
    const ids = this.data.monitors.map((monitor) => monitor.channelId);
    return ids.includes(channelId);
  }
  private parseFilename(filename: string): { basename: string; ext: string } {
    const parts = filename.split('.');
    const ext = parts.pop() || '???';
    const basename = parts.join('.');
    return { basename, ext };
  }
  private resolveFilename(dataDir: string, filename: string): string {
    let filepath = join(dataDir, filename);
    if (fs.existsSync(filepath)) {
      const { basename, ext } = this.parseFilename(filename);
      filepath = join(dataDir, `${basename}-${Date.now().toString()}.${ext}`);
    }
    return filepath;
  }
  private addMonitor(name: string, id: string): boolean {
    if (this.data.monitors.map((monitor) => monitor.channelId).includes(id)) return false;
    const newData = this.data;
    newData.monitors.push({ name, channelId: id });
    this.saveData(newData);
    return true;
  }
  private removeMonitor(id: string) {
    const ifIncludes = this.data.monitors.map((monitor) => monitor.channelId).includes(id);
    const newData = this.data;
    newData.monitors = this.data.monitors.filter((monitor) => monitor.channelId !== id);
    this.saveData(newData);
    return ifIncludes;
  }
  private get availableChannels() {
    const ids = this.data.monitors.map((monitor) => monitor.channelId);
    return `Now monitoring channels \n ${ids.map(util.genChannelString).join('\n')}`;
  }
  private async saveAttachmentIntoDataDir(
    attachments: Attachments,
    dataDir: string,
    URL_PRESET?: string
  ): Promise<{ url: string; name: string }[]> {
    const results = attachments.map(async (attachment) => {
      const filename = attachment.name;
      const filepath = this.resolveFilename(dataDir, filename);
      const buffer = await (await fetch(attachment.url)).arrayBuffer();
      Bun.write(filepath, buffer);
      if (!URL_PRESET) {
        return { url: filepath, name: filename };
      }
      const fullURL = URL_PRESET + '/' + filename;
      return { url: fullURL, name: filename };
    });
    return Promise.all(results);
  }
  public get slashCommands() {
    const commands: Command[] = [];
    const fb_turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('fb_turn_on')
        .setDescription('iBotCore::FileBinder : turn on file binding with this channel'),
      execute: async (interaction) => {
        const channel = interaction.channel;
        if (!channel || channel.type !== 0) return;
        const { id, name } = channel;
        const result = this.addMonitor(name, id);
        const message = (result ? 'Successfully set' : 'Already set') + '\n' + this.availableChannels;
        await interaction.reply(message);
      },
    };
    commands.push(fb_turn_on);
    const fb_turn_off: Command = {
      data: new SlashCommandBuilder().setName('fb_turn_off').setDescription('unset this channel for file binding'),
      execute: async (interaction) => {
        const channel = interaction.channel;
        if (!channel || channel.type !== 0) return;
        const { id, name } = channel;
        const result = this.removeMonitor(id);
        const message = (result ? 'Successfully unset' : 'Already unset') + this.availableChannels;
        await interaction.reply(message);
      },
    };
    commands.push(fb_turn_off);
    return commands;
  }
  public get events(): EventSet[] {
    return [
      {
        name: 'FileBinder::Main',
        once: false,
        event: Events.MessageCreate,
        listener: async (message: Message) => {
          if (!message) return;
          if (message.author.bot || message.attachments.size === 0) return;
          if (!this.checkChannelId(message.channelId)) return;
          const results = await this.saveAttachmentIntoDataDir(
            message.attachments,
            this.bindingDirPath,
            this.urlPreset
          );
          this.printInfo(`added ${results.length}-files. {${results.map((result) => result.name).join(',')}}`);
          const out = `${results.map((result) => `[${result.name}](<${result.url}>)`).join('\n')}`;
          message.reply(out);
        },
      },
    ] as EventSet[];
  }
}
