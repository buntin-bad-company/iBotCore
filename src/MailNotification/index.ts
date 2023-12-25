import Database, { Statement } from 'bun:sqlite';
import fastq from 'fastq';
import imap from 'imap';
import ImapClientType from 'imap';
import BoxType from 'imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuComponent,
  Interaction,
  TextInputBuilder,
  TextInputStyle,
  ModalActionRowComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Events,
  CommandInteraction,
  ChannelType,
  EmbedBuilder,
  InteractionReplyOptions,
} from 'discord.js';
import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';

// global
import { Division } from '../Division';
import { Core } from '../Core';
import * as util from '../utils';

//local
import { ServerConfig } from './types';
import { transformServerConfig, testIMAPConnection } from './utils';

export class MailNotification extends Division {
  /* 
  p::name:string
  ronly::core:Core
  p::commands:Command[]
  p::eventSets:EventSet[]
  p:: division_data_dir: string
  */
  private online: boolean;
  private _mailCronClient: Elysia;
  private _mailQueueClient: Elysia;
  private maildb: Database;
  private serverdb: Database;
  private channeldb: Database;
  private mailDatabaseFilePath: string;
  private serverDatabaseFilePath: string;
  private channelDatabaseFilePath: string;
  private mailNotificationQueue: ParsedMail[];
  constructor(core: Core) {
    super(core);
    this.online = false;
    this.mailDatabaseFilePath = `${this.division_data_dir}/mail.db`;
    this.serverDatabaseFilePath = `${this.division_data_dir}/server.db`;
    this.channelDatabaseFilePath = `${this.division_data_dir}/channel.db`;
    this._mailCronClient = new Elysia().use(
      cron({
        name: 'mail-notification',
        pattern: '0,20,40 * * * * *',
        run: this.mailNotificationMailCronHandler.bind(this) as () => void,
      })
    );
    this._mailQueueClient = new Elysia().use(
      cron({
        name: 'mail-notification-queue',
        pattern: '10,20,30,40,50 * * * * *',
        run: this.mailNotificationQueueHandler.bind(this) as () => void,
      })
    );
    const maildbStatus = util.checkPathSync(this.mailDatabaseFilePath);
    const serverdbStatus = util.checkPathSync(this.serverDatabaseFilePath);
    const channeldbStatus = util.checkPathSync(this.channelDatabaseFilePath);
    const mailCheck = !maildbStatus.exists && !maildbStatus.isFile;
    const serverCheck = !serverdbStatus.exists && !serverdbStatus.isFile;
    const channelCheck = !channeldbStatus.exists && !channeldbStatus.isFile;
    this.maildb = new Database(this.mailDatabaseFilePath);
    this.serverdb = new Database(this.serverDatabaseFilePath);
    this.channeldb = new Database(this.channelDatabaseFilePath);
    if (mailCheck || serverCheck || channelCheck) {
      this.initDatabase(maildbStatus, serverdbStatus, channeldbStatus);
    }
    if (this.serverConfigs.length > 0 && this.channelIds.length > 0) {
      this.setOnline();
    }
    this.mailNotificationQueue = [];

    this.printInitMessage();
  }
  private initDatabase(
    maildbStatus: FileStatus,
    serverdbStatus: FileStatus,
    channeldbStatus: FileStatus
  ) {
    //maildb
    if (!maildbStatus.exists || !maildbStatus.isFile) {
      this.maildb.exec(`
    CREATE TABLE IF NOT EXISTS mail_ids (
      id INTEGER PRIMARY KEY,
      mail_id TEXT NOT NULL,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    }
    this.maildb = new Database(this.mailDatabaseFilePath);
    //serverdb
    if (!serverdbStatus.exists || !serverdbStatus.isFile) {
      this.serverdb.exec(`
      CREATE TABLE IF NOT EXISTS server_configs (
        id INTEGER PRIMARY KEY,
        host TEXT NOT NULL,
        user TEXT NOT NULL,
        password TEXT NOT NULL
      )
    `);
    }
    this.serverdb = new Database(this.serverDatabaseFilePath);
    //channeldb
    if (!channeldbStatus.exists || !channeldbStatus.isFile) {
      this.channeldb.exec(`
    CREATE TABLE IF NOT EXISTS channel_ids (
      id INTEGER PRIMARY KEY,
      channel_id TEXT NOT NULL
      );
    CREATE INDEX IF NOT EXISTS idx_channel_id ON channel_ids (channel_id);
    `);
    }
    this.channeldb = new Database(this.channelDatabaseFilePath);
  }
  private transformMailToEmbed(mail: ParsedMail): EmbedBuilder {
    const embed = new EmbedBuilder().setTitle(mail.subject || '無題');
    embed.setAuthor({ name: mail.from?.text || '不明', iconURL: '', url: '' });

    // description に本文を設定（最大文字数の 3/4 まで）
    const maxDescriptionLength = 4096; // Discord の embed の最大文字数
    let description = mail.text || '';
    if (description.length > maxDescriptionLength * 0.75) {
      description =
        description.substring(0, Math.floor(maxDescriptionLength * 0.75)) +
        '...';
    }
    embed.setTitle(mail.subject || '無題');
    embed.setDescription(description);
    if (mail.date) embed.setTimestamp(mail.date);
    if (mail.to) {
      const isArray = Array.isArray(mail.to);
      let ary: AddressObject[] = [];
      if (!mail.to && isArray) {
        const to = mail.to as AddressObject[];
        ary.concat(to);
      }
      if (mail.to && !isArray) {
        const to = mail.to as AddressObject;
        ary.push(to);
      }
      const toString = ary.map((item) => item.text).join(', ');
      embed.addFields({ name: 'To', value: toString });
    }
    if (mail.cc) {
      const isArray = Array.isArray(mail.to);
      let ary: AddressObject[] = [];
      if (!mail.cc && isArray) {
        const cc = mail.cc as AddressObject[];
        ary.concat(cc);
      }
      if (mail.cc && !isArray) {
        const cc = mail.cc as AddressObject;
        ary.push(cc);
      }
      const toString = ary.map((item) => item.text).join(', ');
      embed.addFields({ name: 'CC', value: toString });
    }
    return embed;
  }
  //'maildb関連';
  public addMailId(mailId: string): void {
    const stmt: Statement = this.maildb.prepare(
      'INSERT OR IGNORE INTO mail_ids (mail_id) VALUES (?)'
    );
    stmt.run(mailId);
  }
  public checkMailIdExists(mailId: string): boolean {
    const stmt: Statement = this.maildb.prepare(
      'SELECT 1 FROM mail_ids WHERE mail_id = ?'
    );
    const result = stmt.get(mailId);
    return result !== undefined;
  }
  public removeMailId(mailId: string): void {
    const stmt: Statement = this.maildb.prepare(
      'DELETE FROM mail_ids WHERE mail_id = ?'
    );
    stmt.run(mailId);
  }
  /* 
================================================================================================================================================
*/
  //mail check main　意図的にinteractionは入れている(TypeScript制約による)
  private async mailNotificationMailCronHandler(
    _interaction?: CommandInteraction
  ) {
    let logMessage = this.createLogMessage(
      'MailNotificationMailCronHandler started'
    );
    this.printInfo(logMessage);
    const serverConfigs = this.serverConfigs;
    logMessage = this.createLogMessage(
      `Server configs loaded: ${serverConfigs.length} counts`
    );
    this.printInfo(logMessage);
    const length = serverConfigs.length;
    for (let i = 0; i < length; i++) {
      const config = serverConfigs[i];
      const address = `${config.user}@${config.host}`;
      logMessage = this.createLogMessage(
        `Executing for address ${address},${i + 1}/${length}`
      );
      this.printInfo(logMessage);

      try {
        const imapConfig = {
          user: config.user,
          password: config.password,
          host: config.host,
          port: 993,
          tls: true,
        };
        const client = new imap(imapConfig);

        client.once('ready', async () => {
          logMessage = this.createLogMessage('IMAP client ready', address);
          this.printInfo(logMessage);

          try {
            client.openBox('INBOX', false, async (err, box) => {
              if (err) {
                throw new Error(`Error opening inbox: ${err.message}`);
              }

              logMessage = this.createLogMessage(
                `Inbox opened with ${box.messages.total} messages`,
                address
              );
              this.printInfo(logMessage);
              this.processMailbox(client, box, address);
            });
          } catch (inboxError) {
            this.handleError(inboxError, 'Error handling inbox', address);
          }
        });

        client.once('error', (clientError) => {
          this.handleError(clientError, 'IMAP client error', address);
        });

        client.connect();
      } catch (connectionError) {
        this.handleError(
          connectionError,
          'Error initializing IMAP client',
          address
        );
      }
    }
    logMessage = this.createLogMessage('MailNotificationMailCronHandler done');
    this.printInfo(logMessage);
  }

  private createLogMessage(
    message: string,
    address?: string,
    current?: number,
    total?: number
  ): string {
    let logMessage = `${message}`;
    if (address) {
      logMessage += ` for ${address}`;
    }
    if (current !== undefined && total !== undefined) {
      logMessage += ` (${current}/${total})`;
    }
    logMessage += ` [${this.now()}]`;
    return logMessage;
  }

  private handleError(error: Error, context: string, address: string) {
    const logMessage = this.createLogMessage(
      `[ERROR]mailNotificationMailCronHandler::[${address}]{${context}: ${error.message}}`
    );
    this.printError(logMessage);
    // Additional error handling logic can be added here
  }

  private processMailbox(
    client: ImapClientType,
    box: BoxType,
    address: string
  ) {
    // Mailbox processing logic with detailed error handling and logging
    // Implement the logic that was in the original code here
  }

  private printError(message: string) {
    console.error(message);
    // Additional error logging mechanism can be implemented
  }

  /* 
================================================================================================================================================
*/
  //division properties
  private setOnline() {
    this.online = true;
  }
  private setOffline() {
    this.online = false;
  }
  //serverdb関連
  private addServerConfig(config: ServerConfig) {
    const stmt = this.serverdb.prepare(`
    INSERT OR REPLACE INTO server_configs (host, user, password) VALUES (?, ?, ?)`);
    stmt.run(config.host, config.user, config.password);
    return { host: config.host, user: config.user, password: config.password };
  }
  private get serverConfigs(): ServerConfig[] {
    const stmt = this.serverdb.prepare(
      'SELECT host, user, password FROM server_configs'
    );
    const rows = stmt.all() as ServerConfig[];
    return rows.map((row) => ({
      host: row.host,
      user: row.user,
      password: row.password,
    }));
  }
  private removeServerConfig(config: ServerConfig) {
    const stmt = this.serverdb.prepare(`
    DELETE FROM server_configs WHERE host = ? AND user = ? AND password = ?`);
    stmt.run(config.host, config.user, config.password);
    let logMessage = `serverdb:removeServerConfig => removed a server config{${JSON.stringify(
      config
    )}}`;
    this.printInfo(logMessage);
  }

  //channeldb関連
  private addChannelId(channelId: string): void {
    const stmt = this.channeldb.prepare(
      'INSERT INTO channel_ids (channel_id) VALUES (?)'
    );
    stmt.run(channelId);
  }
  private removeChannelId(channelId: string): void {
    const stmt = this.channeldb.prepare(
      'DELETE FROM channel_ids WHERE channel_id = ?'
    );
    stmt.run(channelId);
  }
  private get channelIds(): string[] {
    const stmt = this.channeldb.prepare('SELECT channel_id FROM channel_ids');
    const rows = stmt.all() as { channel_id: string }[]; // 修正: as { channel_id: string }[]
    return rows.map((row) => row.channel_id);
  }
  private mailNotificationExecAChunk(mails: ParsedMail[]) {
    const embeds = mails.map((mail) => this.transformMailToEmbed(mail));
    const channels = this.core.channels.cache.filter((channel) =>
      this.channelIds.includes(channel.id)
    );
    const message = {
      content: 'iBotCore::MailNotification => Mail Notification',
      embeds,
    };
    for (const channel of channels.values()) {
      if (channel.type === ChannelType.GuildText) {
        channel.send(message);
      }
    }
  }

  //mailNotificationQueue関連 ログメッセージすべて完了。
  private mailNotificationQueueHandler() {
    const length = this.mailNotificationQueue.length;
    if (length === 0) {
      let logMessage = `MailNotificationQueueHandler => No mail to notify ${new Date().toLocaleString()}`;
      logMessage = this.printInfo(logMessage);

      return;
    }
    let logMessage = `MailNotificationQueueHandler => ${length} mail notify ${new Date().toLocaleString()}`;
    logMessage = this.printInfo(logMessage);

    const mailChunks = util.splitArrayIntoChunks(
      this.mailNotificationQueue,
      10
    );
    logMessage = `MailNotificationQueueHandler => ${
      mailChunks.length
    } chunks going to execute ${new Date().toLocaleString()}`;
    logMessage = this.printInfo(logMessage);

    for (const chunk of mailChunks) {
      this.mailNotificationExecAChunk(chunk);
      this.mailNotificationQueue = this.mailNotificationQueue.filter((mail) => {
        return !chunk.includes(mail);
      });
    }
    logMessage = `MailNotificationQueueHandler => Done ${length} mails ${new Date().toLocaleString()}`;
    logMessage = this.printInfo(logMessage);
  }
  //display関連
  private printf(str: string) {
    const message = `iBotCore::${this.name} => ${str}`;
    const pushMessage = this.printInfo(message);
    const channels = this.core.channels.cache.filter((channel) =>
      this.channelIds.includes(channel.id)
    );
    for (const channel of channels.values()) {
      if (channel.type === ChannelType.GuildText) {
        channel.send(pushMessage);
      }
    }
  }

  //slashcommand,, this.channelIds関連
  private turnOn(channelId: string) {
    try {
      this.addChannelId(channelId);
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
    try {
      let ifRemoved = false;
      if (this.channelIds.includes(channelId)) {
        this.removeChannelId(channelId);
        ifRemoved = true;
      }
      if (this.channelIds.length === 0) {
        this.setOffline();
      }
      return {
        ifRemoved,
        ifOnline: this.online,
      };
    } catch (e) {
      console.error(e);
      return {
        ifRemoved: false,
        ifOnline: this.online,
      };
    }
  }
  //slashcommand,, modal,serverconfig関連
  // モーダルSUBMITイベントの処理
  private handleModalSubmitEventSet: InteractionCreateEventSet = {
    name: 'mn::slashcommand:modalsubmits:handler',
    once: false,
    event: Events.InteractionCreate,
    listener: async (interaction: Interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === 'mailserverModal') {
        // ユーザー名、ホスト名、パスワードを取得
        const host = interaction.fields.getField('host').value;
        const user = interaction.fields.getField('user').value;
        const password = interaction.fields.getField('password').value;
        const config: ServerConfig = { host, user, password };
        const added = this.addServerConfig(config);
        const result = await testIMAPConnection(host, user, password);
        if (result) {
          this.printInfo(
            `Modal:Submits:handler-> added a server config{${JSON.stringify(
              added
            )}}`
          );
          this.setOnline();
          interaction.editReply({
            content: `[${user}@${host}](<${user}@${host}>) is online`,
            ephemeral: true,
          } as any);
        } else {
          this.printInfo(
            `Modal:Submits:handler-> failed to add a server config{${JSON.stringify(
              added
            )}}`
          );
          interaction.editReply({
            content:
              'Mail server configuration failed' +
              `${(added.user, added.host)}`,
            ephemeral: true,
          } as any);
        }
        await interaction.reply({
          content: 'Mail server configuration saved',
          ephemeral: true,
        });
      }
      if (interaction.customId === 'removeServerModal') {
        let message: InteractionReplyOptions = {
          content: 'Mail server configuration removed',
          ephemeral: true,
        };
        try {
          const user = interaction.fields.getTextInputValue('user');
          const host = interaction.fields.getTextInputValue('host');
          const password = interaction.fields.getField('password').value;
          this.removeServerConfig({ user, host, password });
        } catch (e) {
          if (e instanceof Error) {
            this.printInfo(
              `Modal:Submits:handler-> failed to remove a server config${e.message}`
            );
            message = {
              content: 'Mail server configuration failed to remove',
              ephemeral: true,
            };
          } else {
            message = {
              content: 'Mail server configuration failed to remove',
              ephemeral: true,
            };
          }
        } finally {
          await interaction.reply(message);
        }
      }
    },
  };

  // StringSelectMenu AutoCompleteイベントの処理
  private handleSelectMenuEventSet: InteractionCreateEventSet = {
    name: 'mn::slashcommand:selectmenu:handler',
    once: false,
    event: Events.InteractionCreate,
    listener: async (interaction) => {
      if (
        interaction.isAutocomplete() &&
        interaction.commandName === 'mn_rm_mailconfig'
      ) {
        const focusedValue = interaction.options.getFocused();
        const serverConfigs = this.serverConfigs;
        const answer = serverConfigs.find((config) =>
          `${config.host}:${config.user}`.includes(focusedValue)
        );
        console.log(answer);
        const choices = serverConfigs.map((config) => ({
          name: `${config.user}@${config.host}`,
          value: `${config.host}:${config.user}`,
        }));

        // Log choices for human readability
        console.log(JSON.stringify(choices, null, 2));

        await interaction.respond(
          choices.filter((choice) =>
            choice.name.toLowerCase().includes(focusedValue.toLowerCase())
          )
        );
      }
    },
  };

  //Division制約 slashCommands get - ():Command[]
  public get slashCommands() {
    const mn_turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_turn_on')
        .setDescription('Turn on mail notification with this channel.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
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
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const result = this.turnOff(channelId);
        const availableChannels = `Success to turn off mail notification.\nNow Available Channels:\n${this.channelIds
          .map(util.genChannelString)
          .join('\n')}`;
        const servers = `${this.serverConfigs
          .map(transformServerConfig)
          .join('\n')}`;
        const availableServers = 'Now Available Servers:\n' + servers;
        await interaction.reply({
          content: `${
            result.ifRemoved ? 'Success' : 'Fail'
          } that remove notification with this channel.\n${
            result.ifOnline
              ? availableChannels + '\n' + availableServers
              : 'Now offline'
          }`,
        });
      },
    };
    const mn_show_status: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_show_status')
        .setDescription('Show the status of mail notification.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const availableChannels = `Now Available Channels:\n${this.channelIds
          .map(util.genChannelString)
          .join('\n')}`;
        const availableServers = `Now Available Servers:\n${this.serverConfigs
          .map((config) => `${config.user}@${config.host}`)
          .join('\n')}`;
        await interaction.reply({
          content: `${
            this.online
              ? availableChannels + '\n' + availableServers
              : 'Now offline'
          }`,
        });
      },
    };
    const mn_show_status_all: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_show_status_all')
        .setDescription('Show the status of mail notification.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const availableChannels = `Now Available Channels:\n${this.channelIds
          .map(util.genChannelString)
          .join('\n')}`;
        const availableServers = `Now Available Servers:\n${this.serverConfigs
          .map(
            (config) =>
              `${config.user}@${config.host}  ||password:"${config.password}"||`
          )
          .join('\n')}`;
        await interaction.reply({
          content: `${
            this.online
              ? availableChannels + '\n' + availableServers
              : 'Now offline'
          }`,
        });
      },
    };
    const mn_add_mailconfiguration: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_add_mailconfig')
        .setDescription('Set mail server information'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const modal = new ModalBuilder()
          .setCustomId('mailserverModal')
          .setTitle('Mail Server Information');
        const hostInput = new TextInputBuilder()
          .setCustomId('host')
          .setLabel('IMAP Mail Server Host _ex. mail.example.ne.jp')
          .setStyle(TextInputStyle.Short);
        const userInput = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('Mail Server User _ex. buntin.synthia')
          .setStyle(TextInputStyle.Short);
        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Mail Server Password _ex. xxxxxxxxx')
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
    const mn_rm_mailconfiguration: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_rm_mailconfig')
        .setDescription('Remove a mail server configuration'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;

        // モーダルを作成
        const modal = new ModalBuilder()
          .setCustomId('removeServerModal')
          .setTitle('Remove Mail Server Configuration');
        const userInput = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('User Name')
          .setStyle(TextInputStyle.Short);
        const hostInput = new TextInputBuilder()
          .setCustomId('host')
          .setLabel('Host')
          .setStyle(TextInputStyle.Short);
        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Password')
          .setStyle(TextInputStyle.Short);
        const actionRowUser =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            userInput
          );
        const actionRowHost =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            hostInput
          );
        const actionRowPassword =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            passwordInput
          );
        modal.addComponents(actionRowUser, actionRowHost, actionRowPassword);

        // モーダルを表示
        await interaction.showModal(modal);
      },
    };

    const mn_fetch: Command = {
      data: new SlashCommandBuilder()
        .setName('mn_fetch')
        .setDescription('Fetch mail'),
      execute: this.mailNotificationMailCronHandler.bind(this),
    };
    return [
      mn_turn_on,
      mn_turn_off,
      mn_add_mailconfiguration,
      mn_rm_mailconfiguration,
      mn_show_status,
      mn_show_status_all,
      mn_fetch,
    ];
  }
  //Division制約 events get - ():EventSet[]
  public get events() {
    return [this.handleModalSubmitEventSet, this.handleSelectMenuEventSet];
  }
}
