import fs from 'fs';
import path from 'path';
import { Events, SlashCommandBuilder } from 'discord.js';

import { Division } from '../Division';
import { Core } from '../Core';
import { FBBotData, Attachments } from './types';
import * as util from '../utils';

class FileBinder extends Division {
  private bindingDirPath: string;
  private fileBinderDivDataPath: string;
  private urlPreset: string;
  constructor(core: Core) {
    const name = 'FileBinder';
    super(core, name);
    const dataDir = Bun.env.FILE_BINDER_DATA_DIR!;
    const botData = Bun.env.FILE_BINDER_BOT_DATA!;
    const urlPreset = Bun.env.FILE_BINDER_URL_PRESET!;
    this.urlPreset = urlPreset;
    this.bindingDirPath = path.join(this.division_data_dir, dataDir);
    if (!fs.existsSync(this.bindingDirPath)) {
      throw new Error('Please provide a valid data directory.');
    } else {
      this.printInfo(`Binding Data Dir exists: ${dataDir}`);
    }
    this.fileBinderDivDataPath = path.join(this.division_data_dir, botData);
    if (!fs.existsSync(this.fileBinderDivDataPath)) {
      throw new Error('Please provide a valid bot data file.');
    } else {
      this.printInfo(`Bot data file exists: ${botData}`);
    }
  }
  private get data() {
    const data: FBBotData | null = util.readJsonFile(this.fileBinderDivDataPath);
    if (!data) {
      throw new Error(
        'iBotCore::FileBinder -> division data dir or json is not loadable.' + this.fileBinderDivDataPath
      );
    }
    return data;
  }
  private saveData() {
    util.writeJsonFile(this.fileBinderDivDataPath, this.data);
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
    let filepath = path.join(dataDir, filename);
    if (fs.existsSync(filepath)) {
      const { basename, ext } = this.parseFilename(filename);
      filepath = path.join(dataDir, `${basename}-${Date.now().toString()}.${ext}`);
    }
    return filepath;
  }
  private addMonitor(name: string, id: string): boolean {
    if (this.data.monitors.map((monitor) => monitor.channelId).includes(id)) return false;
    this.data.monitors.push({ name, channelId: id });
    this.saveData();
    return true;
  }
  private removeMonitor(id: string) {
    const ifIncludes = this.data.monitors.map((monitor) => monitor.channelId).includes(id);
    this.data.monitors = this.data.monitors.filter((monitor) => monitor.channelId !== id);
    this.saveData();
    return ifIncludes;
  }
  private get availableChannels() {
    const ids = this.data.monitors.map((monitor) => monitor.channelId);
    return `Now monitoring channels \n ${ids.map((id) => `<#${id}>`).join('\n')}`;
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
      fs.writeFileSync(filepath, buffer);
      if (!URL_PRESET) {
        return { url: filepath, name: filename };
      }
      const fullURL = URL_PRESET + '/' + filepath;
      return { url: fullURL, name: filename };
    });
    return Promise.all(results);
  }
  public get slashCommands() {
    //fb_turn_on;
    const commands: Command[] = [];
    const fb_turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('fb_turn_on')
        .setDescription('iBotCore::FileBinder\nturn on file binding with this channel'),
      execute: async (interaction) => {
        const channel = interaction.channel;
        if (!channel || channel.type !== 0) return;
        const { id, name } = channel;
        const result = this.addMonitor(name, id);
        const message = (result ? 'Successfully set' : 'Already set') + this.availableChannels;
        await interaction.reply(message);
      },
    };
    commands.push(fb_turn_on);

    //fb_turn_off;
    const fb_turn_off: Command = {
      data: new SlashCommandBuilder().setName('unset').setDescription('unset this channel for file binding'),
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
    const main: EventSet = {
      name: 'FileBinder::Main',
      once: false,
      event: Events.MessageCreate,
      listener: async (message) => {
        if (!message) return;
        if (message.author.bot || message.attachments.size === 0) return;
        if (!this.checkChannelId(message.channelId)) return;
        const results = await this.saveAttachmentIntoDataDir(message.attachments, this.bindingDirPath, this.urlPreset);
        const out = `${results.map((result) => `[${result.name}](<${result.url}>)`).join('\n')}`;
        message.reply(out);
      },
    };
    const events: EventSet[] = [];
    return events;
  }
}
