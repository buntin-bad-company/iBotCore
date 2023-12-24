import Database, { Statement } from 'bun:sqlite';
import imap from 'imap';
import { simpleParser } from 'mailparser';
import {
  Channel,
  Events,
  SlashCommandBuilder,
  TextInputComponent,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalActionRowComponentBuilder,
  Interaction,
} from 'discord.js';

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
  private _client: Elysia | null;
  private db: Database | null;
  private databaseFilePath: string;
  constructor(core: Core) {
    super(core);
    this.online = false;
    this.databaseFilePath = `${this.division_data_dir}/mail.db`;
    this.channelIds = [];
    this._client = new Elysia().use(
      cron({
        name: 'mail-notification',
        pattern: '0 * * * * *',
        run: this.mailNotification.bind(this),
      })
    );
    this.db = new Database(this.databaseFilePath);
    const status = util.checkPathSync(this.databaseFilePath);
    if (!status.exists && !status.isFile) {
      this.initDatabase();
    }
    this.printInitMessage();
  }
  private initDatabase() {
    const db = new Database(this.databaseFilePath);

    // メールIDを格納するためのテーブルを作成する
    db.exec(`CREATE TABLE IF NOT EXISTS mail_ids (
  id INTEGER PRIMARY KEY,
  mail_id TEXT NOT NULL,
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
  }
  public addMailId(mailId: string): void {
    if (this.db === null) throw new Error('Database is not initialized.');
    const stmt: Statement = this.db.prepare(
      'INSERT OR IGNORE INTO mail_ids (mail_id) VALUES (?)'
    );
    stmt.run(mailId);
  }

  public checkMailIdExists(mailId: string): boolean {
    if (this.db === null) throw new Error('Database is not initialized.');
    const stmt: Statement = this.db.prepare(
      'SELECT 1 FROM mail_ids WHERE mail_id = ?'
    );
    const result = stmt.get(mailId);
    return result !== undefined;
  }

  public removeMailId(mailId: string): void {
    if (this.db === null) throw new Error('Database is not initialized.');
    const stmt: Statement = this.db.prepare(
      'DELETE FROM mail_ids WHERE mail_id = ?'
    );
    stmt.run(mailId);
  }

  private mailNotification() {
    console.log('mail-notification');
  }

  private setOnline() {
    this.online = true;
  }

  private setOffline() {
    this.online = false;
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
  private handleModalSubmitEventSet: InteractionCreateEventSet = {
    name: 'mn::slashcommand:modalsubmits:handler',
    once: false,
    event: 'interactionCreate',
    listener: async (interaction: Interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === 'mailserverModal') {
        const host = interaction.fields.getTextInputValue('host');
        const user = interaction.fields.getTextInputValue('user');
        const password = interaction.fields.getTextInputValue('password');
        console.log({ host, user, password });
        await interaction.reply({
          content: 'Mail server information updated!',
          ephemeral: true,
        });
      }
    },
  };

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
          content: `${
            result.ifRemoved ? 'Success' : 'Fail'
          } that remove notification with this channel.\n${
            result.ifOnline ? availables : 'Now offline'
          }`,
        });
      },
    };
    const mn_add_mailconfiguration: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_add_mailconfig')
        .setDescription('Set mail server information'),
      execute: async (interaction) => {
        const modal = new ModalBuilder()
          .setCustomId('mailserverModal')
          .setTitle('Mail Server Information');
        const hostInput = new TextInputBuilder()
          .setCustomId('host')
          .setLabel('Mail Server Host')
          .setStyle(TextInputStyle.Short);
        const userInput = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('Mail Server User')
          .setStyle(TextInputStyle.Short);
        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Mail Server Password')
          .setStyle(TextInputStyle.Short);
        const firstActionRow =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            hostInput
          );
        const secondActionRow =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            userInput
          );
        const thirdActionRow =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            passwordInput
          );
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        await interaction.showModal(modal);
      },
    };
    return [mn_turn_on, mn_turn_off, mn_add_mailconfiguration];
  }
  public get events() {
    return [this.handleModalSubmitEventSet];
  }
}
