import { Database } from 'bun:sqlite';
import imap from 'imap';
import { simpleparser } from 'mailparser';
import { Channel, Events, SlashCommandBuilder } from 'discord.js';
import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import { Division } from '../Division';
import { Core } from '../Core';
import * as util from '../utils';

export class MailNotification extends Division {
  /* 
  p::name:string
  ronly::core:Core
  p::commands:Command[]
  p::eventSets:EventSet[]
  p:: division_data_dir: string
  */
  private online: boolean;
  private channelIds: string[];
  private client: Elysia | null;
  private db: Database | null;
  private databaseFilePath: string;
  constructor(core: Core) {
    super(core);
    this.online = false;
    this.channelIds = [];
    this.client = null;
    this.databaseFilePath = `${this.division_data_dir}/mail.db`;
    try {
      const db = new Database(this.databaseFilePath);
      db.exec('PRAGMA journal_mode = WAL;');
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to open database. [${this.databaseFilePath}]`);
    }
    this.db = null;
    // if () {
    // } else {
    // }
    this.printInitMessage();
  }

  private mailNotification() {
    console.log('mail-notification');
  }
  
  private setOnline() {
    this.online = true;
    this.client = new Elysia().use(
      cron({
        name: 'mail-notification',
        pattern: '0 * * * * *',
        run: this.mailNotification.bind(this),
      })
    );
    this.db = new Database(this.databaseFilePath);
  }
  private setOffline() {
    this.online = false;
    this.client = null;
  }
  private turnOn(channelId: string) {
    try {
      this.channelIds.push(channelId);
      if (!this.online) {
        this.setOnline();
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  private turnOff(channelId: string) {
    let ifRemoved = false;
    const prevLength = this.channelIds.length;
    this.channelIds = this.channelIds.filter((id) => id !== channelId);
    if (prevLength > this.channelIds.length) {
      ifRemoved = true;
    }
    if (this.channelIds.length === 0) {
      this.setOffline();
    }
    return {
      ifRemoved,
      ifOnline: this.online,
    };
  }

  public get slashCommands() {
    const mn_turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_turn_on')
        .setDescription('Turn on mail notification with this channel.'),
      execute: async (interaction) => {
        const channelId = interaction.channelId;
        const result = this.turnOn(channelId);
        await interaction.reply({
          content: `${
            result ? 'Success' : 'Failed'
          } to turn on mail notification.\nNow Available Channels:\n${this.channelIds
            .map(util.genChannelString)
            .join('\n')}`,
        });
      },
    };
    const mn_turn_off: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_turn_off')
        .setDescription('Turn off mail notification with this channel.'),
      execute: async (interaction) => {
        const channelId = interaction.channelId;
        const result = this.turnOff(channelId);
        const availables = `Success to turn off mail notification.\nNow Available Channels:\n${this.channelIds
          .map(util.genChannelString)
          .join('\n')}`;
        await interaction.reply({
          content: `${result.ifRemoved ? 'Success' : 'Fail'} that remove notification with this channel.\n${
            result.ifOnline ? availables : 'Now offline'
          }`,
        });
      },
    };
    return [mn_turn_on, mn_turn_off];
  }
  public get events() {
    return [] as EventSet[];
  }
}
