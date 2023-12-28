import Database, { Statement } from 'bun:sqlite';
import { ParsedMail, AddressObject, simpleParser } from 'mailparser';
import { ImapFlow, FetchQueryObject } from 'imapflow';
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  Interaction,
  TextInputBuilder,
  TextInputStyle,
  ModalActionRowComponentBuilder,
  Events,
  CommandInteraction,
  ChannelType,
  EmbedBuilder,
  InteractionReplyOptions,
  Collection,
  Message,
} from 'discord.js';
import { Elysia } from 'elysia';
import { cron } from '@elysiajs/cron';
import { $ } from 'zx';
import 'zx/globals';

// global
import { Division } from '../Division';
import { Core } from '../Core';
import * as util from '../utils';

//local
import { ServerConfig } from './types';
import { transformServerConfig } from './utils';

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
  private imapServerConnections: Collection<string, ImapFlow>;
  private mailNotificationQueue: ParsedMail[];
  constructor(core: Core) {
    super(core);
    let logMessage = 'Constructor : Initializing Main Properties';
    this.printInfo(logMessage);
    logMessage = 'Constructor : Initializing Database Instance';
    this.printInfo(logMessage);
    this.online = false;
    this.mailDatabaseFilePath = `${this.division_data_dir}/mail.db`;
    this.serverDatabaseFilePath = `${this.division_data_dir}/server.db`;
    this.channelDatabaseFilePath = `${this.division_data_dir}/channel.db`;
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
    logMessage = 'Constructor : Initialized Database Instance';
    this.printInfo(logMessage);

    logMessage = 'Constructor : Initializing Imap Server Connections';
    this.printInfo(logMessage);
    this.imapServerConnections = new Collection();
    this.mailNotificationQueue = [];
    if (this.serverConfigs.length > 0) {
      const logMessage = `Constructor => ${this.serverConfigs.length} server configs loaded`;
      this.printInfo(logMessage);
      this.initIMAPServers();
    }
    logMessage = 'Constructor : Initialized Imap Server Connections';
    this.printInfo(logMessage);

    logMessage = 'Constructor : Initializing Main Switches';
    this.printInfo(logMessage);
    if (this.serverConfigs.length > 0 && this.channelIds.length > 0) {
      this.setOnline();
    }
    logMessage = this.printInfo(`Constructor : ${this.online ? 'Online' : 'Offline'}`);
    logMessage = this.printInfo('Constructor : Initialized Main Switches');
    logMessage = this.printInfo('Constructor : Initializing Cron Clients');
    this._mailCronClient = new Elysia().use(
      cron({
        name: 'mail-notification',
        pattern: '0,20,40 * * * * *',
        run: this.mailCronHandler.bind(this) as () => void,
      })
    );
    this._mailQueueClient = new Elysia().use(
      cron({
        name: 'mail-notification-queue',
        pattern: '10,20,30,40,50 * * * * *',
        run: this.queueHandler.bind(this) as () => void,
      })
    );
    logMessage = this.printInfo('Constructor : Initialized Cron Clients');
    logMessage = this.printInfo('Constructor : Done');
    Bun.sleepSync(500);

    this.printInitMessage();
  }
  private initIMAPServers() {
    const serverConfigs = this.serverConfigs;
    for (const config of serverConfigs) {
      const { host, user, password } = config;
      const address = `${user}@${host}`;
      const key = `${host}:${user}`;
      let logMessage = this.createLogMessage(`initImapServers : Initializing IMAP Server key=${key}`, address);
      this.printInfo(logMessage);
      const imapServer = new ImapFlow({
        host: host,
        port: 993,
        secure: true,
        auth: {
          user: address,
          pass: password,
        },
      });
      this.imapServerConnections.set(key, imapServer);
      logMessage = this.createLogMessage('initImapServers : Initialized', address);
      this.printInfo(logMessage);
      const t = imapServer.eventNames.bind(imapServer).toString();
      console.log(t);
      imapServer.on('mail', (mailId) => {
        this.handleNewMail(imapServer, mailId);
      });
    }
  }

  private async handleNewMail(imapServer: ImapFlow, mailId: string) {
    let logMessage = 'handleNewMail : started';
    logMessage = this.printInfo(logMessage);
    try {
      const fetchQueryObject: FetchQueryObject = {
        uid: true,
        envelope: true,
        size: true,
        bodyParts: ['text', 'html'],
        source: true,
      }; // メールデータをパース
      const mailData = await imapServer.fetchOne(mailId, fetchQueryObject);
      const parsedMail = await simpleParser(mailData.source);
      // メールIDがDBに存在するか確認
      const uid = mailData.uid.toString();
      const mailIdExists = this.checkMailIdExists(uid);
      const mailIdExistsMessage = `handleNewMail : Mail ID exists : ${uid}`;
      const mailIdNotExistsMessage = `handleNewMail : Mail ID not exists : ${uid}`;
      logMessage = this.printInfo(mailIdExists ? mailIdExistsMessage : mailIdNotExistsMessage);
      // メールIDがDBに存在する場合は何もしない
      if (mailIdExists) {
        logMessage = this.createLogMessage('handleNewMail : Mail ID exists', parsedMail.from?.text);
        logMessage = this.printInfo(logMessage);
        return;
      }
      // メールIDをDBに追加
      this.addMailId(mailId);
      this.mailNotificationQueue.push(parsedMail);
      logMessage = this.createLogMessage('handleNewMail : Mail ID added', parsedMail.from?.text);
      logMessage = this.printInfo(logMessage);
    } catch (error) {
      console.error('Error handling new mail:', error);
    }
  }

  private reConnectIMAPConnection() {}

  private transformMailToEmbed(mail: ParsedMail): EmbedBuilder {
    const embed = new EmbedBuilder().setTitle(mail.subject || '無題');
    embed.setAuthor({ name: mail.from?.text || '不明', iconURL: '', url: '' });

    // description に本文を設定（最大文字数の 3/4 まで）
    const maxDescriptionLength = 4096; // Discord の embed の最大文字数
    let description = mail.text || '';
    if (description.length > maxDescriptionLength * 0.75) {
      description = description.substring(0, Math.floor(maxDescriptionLength * 0.75)) + '...';
    }
    embed.setTitle(mail.subject || '無題');
    embed.setDescription(description);
    if (mail.date) embed.setTimestamp(mail.date);
    if (mail.to) {
      const isArray = Array.isArray(mail.to);
      const ary: AddressObject[] = [];
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
      const ary: AddressObject[] = [];
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
  /* 
================================================================================================================================================
*/
  //mail check main 意図的にinteractionは入れている(TypeScript制約による)
  private async mailCronHandler(_interaction?: CommandInteraction) {
    let logMessage = 'mailCronHandler: started';
    this.printInfo(logMessage);
    if (_interaction) {
      logMessage = `mailCronHandler:${_interaction.commandName} => called with DevMode.`;
      logMessage = this.printInfo(logMessage);
      _interaction.reply(logMessage);
    }
    const serverConfigs = this.serverConfigs;
    logMessage = `mailCronHandler: Server configs loaded: ${serverConfigs.length} counts`;
    this.printInfo(logMessage);
    const length = serverConfigs.length;
    for (let i = 0; i < length; i++) {
      const config = serverConfigs[i];
      const { host, user, password } = config;
      const address = `${user}@${host}`;
      const key = `${host}:${user}`;
      logMessage = this.createLogMessage(`mailCronHandler: Checking mail for ${address}`, address, i + 1, length);
      this.printInfo(logMessage);
      const imapServer = this.imapServerConnections.get(key);
      if (!imapServer) {
        logMessage = this.createLogMessage('mailCronHandler: imapServer not found', address, i + 1, length);
        this.printInfo(logMessage);
        continue;
      }
      await imapServer.connect();
      const fetchQueryObject: FetchQueryObject = {
        uid: true,
        envelope: true,
        size: true,
        bodyParts: ['text', 'html'],
        source: true,
      };
      const mailIds = await imapServer.search({ seen: false });
      const mailIdsLength = mailIds.length;
      logMessage = this.createLogMessage(
        `mailCronHandler: ${mailIdsLength} mails found for ${address}`,
        address,
        i + 1,
        length
      );
      this.printInfo(logMessage);
      for (let j = 0; j < mailIdsLength; j++) {
        const mailId = mailIds[j];
        logMessage = this.createLogMessage(
          `mailCronHandler: Checking mail ${mailId} for ${address}`,
          address,
          j + 1,
          mailIdsLength
        );
        this.printInfo(logMessage);
        const mailData = await imapServer.fetchOne(mailId.toString(), fetchQueryObject);
        const parsedMail = await simpleParser(mailData.source);
        const mailIdExists = this.checkMailIdExists(parsedMail.messageId || 'undefined');
        const mailIdExistsMessage = `mailCronHandler: Mail ID exists : ${parsedMail.messageId}`;
        const mailIdNotExistsMessage = `mailCronHandler: Mail ID not exists : ${parsedMail.messageId}`;
        logMessage = this.createLogMessage(
          mailIdExists ? mailIdExistsMessage : mailIdNotExistsMessage,
          address,
          j + 1,
          mailIdsLength
        );
        this.printInfo(logMessage);
        if (mailIdExists) {
          logMessage = this.createLogMessage(
            `mailCronHandler: Mail ID exists : ${parsedMail.messageId}`,
            address,
            j + 1,
            mailIdsLength
          );
          this.printInfo(logMessage);
          continue;
        }
        this.addMailId(mailId.toString());
        this.mailNotificationQueue.push(parsedMail);
        logMessage = this.createLogMessage(
          `mailCronHandler: Mail ID added : ${parsedMail.messageId}`,
          address,
          j + 1,
          mailIdsLength
        );
        logMessage = this.printInfo(logMessage);
      }
    }
    if (_interaction) {
      logMessage = `mailCronHandler:${_interaction.commandName} => done`;
      logMessage = this.printInfo(logMessage);
      _interaction.editReply(logMessage);
    }
    logMessage = 'mailCronHandler: done';
    this.printInfo(logMessage);
  }

  private createLogMessage(message: string, address?: string, current?: number, total?: number): string {
    let logMessage = `${message}`;
    if (address) {
      logMessage += ` for ${address}`;
    }
    if (current !== undefined && total !== undefined) {
      logMessage += ` (${current}/${total})`;
    }
    return this.printInfo(logMessage);
  }
  /* 
================================================================================================================================================
*/
  //division properties
  private setOnline() {
    this.online = true;
    this.discordNotification('iBotCore::MailNotification : SetOnline => Server Started');
  }
  private setOffline() {
    this.online = false;
  }
  /* 
================================================================================================================================================
*/
  //Database関連
  private initDatabase(maildbStatus: FileStatus, serverdbStatus: FileStatus, channeldbStatus: FileStatus) {
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
  public purgeDB() {
    this.printInfo('purgeDB : Purging DB [client : online , API Mode]');
    this.maildb.exec('DELETE FROM mail_ids');
    this.serverdb.exec('DELETE FROM server_configs');
    this.channeldb.exec('DELETE FROM channel_ids');
    this.printInfo('purgeDB : Purged DB [client : online , API Mode]');
  }
  public async disclosureDatabases() {
    let logMessage = 'disclosureDatabases: Running queries for database info';
    this.printInfo(logMessage);
    try {
      $.verbose = false;
      let dbResults = '';
      // Query maildb
      const maildbResults = this.maildb.prepare('SELECT * FROM mail_ids').all();
      dbResults += 'MailDB Results:\n' + JSON.stringify(maildbResults, null, 2) + '\n';
      // Query serverdb
      const serverdbResults = this.serverdb.prepare('SELECT * FROM server_configs').all();
      dbResults += 'ServerDB Results:\n' + JSON.stringify(serverdbResults, null, 2) + '\n';
      // Query channeldb
      const channeldbResults = this.channeldb.prepare('SELECT * FROM channel_ids').all();
      dbResults += 'ChannelDB Results:\n' + JSON.stringify(channeldbResults, null, 2) + '\n';

      logMessage = this.printInfo('disclosureDatabases: Done');
      logMessage = this.printInfo(dbResults);
    } catch (e) {
      if (e instanceof Error) {
        logMessage = this.printError(`mailNotification::turnOn->${e.message}`);
      } else {
        logMessage = this.printError(`mailNotification::turnOn->${e}`);
      }
      logMessage = this.printError(logMessage);
    } finally {
      $.verbose = true;
    }
    return logMessage;
  }
  //'maildb関連';
  protected addMailId(mailId: string): void {
    const stmt: Statement = this.maildb.prepare('INSERT OR IGNORE INTO mail_ids (mail_id) VALUES (?)');
    stmt.run(mailId);
  }
  protected checkMailIdExists(mailId: string): boolean {
    const stmt: Statement = this.maildb.prepare('SELECT 1 FROM mail_ids WHERE mail_id = ?');
    const result = stmt.get(mailId);
    return result !== undefined;
  }
  protected removeMailId(mailId: string): void {
    const stmt: Statement = this.maildb.prepare('DELETE FROM mail_ids WHERE mail_id = ?');
    stmt.run(mailId);
  }
  //serverdb関連
  private addServerConfig(config: ServerConfig) {
    const stmt = this.serverdb.prepare(`
    INSERT OR REPLACE INTO server_configs (host, user, password) VALUES (?, ?, ?)`);
    stmt.run(config.host, config.user, config.password);
    return { host: config.host, user: config.user, password: config.password };
  }
  private get serverConfigs(): ServerConfig[] {
    const stmt = this.serverdb.prepare('SELECT host, user, password FROM server_configs');
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
    const logMessage = `serverdb:removeServerConfig => removed a server config{${JSON.stringify(config)}}`;
    this.printInfo(logMessage);
  }

  //channeldb関連
  private addChannelId(channelId: string): void {
    const stmt = this.channeldb.prepare('INSERT INTO channel_ids (channel_id) VALUES (?)');
    stmt.run(channelId);
  }
  private removeChannelId(channelId: string): void {
    const stmt = this.channeldb.prepare('DELETE FROM channel_ids WHERE channel_id = ?');
    stmt.run(channelId);
  }
  private get channelIds(): string[] {
    const stmt = this.channeldb.prepare('SELECT channel_id FROM channel_ids');
    const rows = stmt.all() as { channel_id: string }[]; // 修正: as { channel_id: string }[]
    return rows.map((row) => row.channel_id);
  }
  /* 
================================================================================================================================================
*/

  //mailNotificationQueue関連 ログメッセージすべて完了。
  private queueHandler() {
    const length = this.mailNotificationQueue.length;
    if (length === 0) {
      let logMessage = 'queueHandler => No mail to notify';
      logMessage = this.printInfo(logMessage);
      return;
    }
    let logMessage = `queueHandler => ${length} mail notify`;
    logMessage = this.printInfo(logMessage);
    const mailChunks = util.splitArrayIntoChunks(this.mailNotificationQueue, 10);
    logMessage = `queueHandler => ${mailChunks.length} chunks going to execute`;
    logMessage = this.printInfo(logMessage);
    for (const chunk of mailChunks) {
      this.mailNotificationExecAChunk(chunk);
      this.mailNotificationQueue = this.mailNotificationQueue.filter((mail) => {
        return !chunk.includes(mail);
      });
    }
    logMessage = `queueHandler => Done ${length} mails`;
    logMessage = this.printInfo(logMessage);
  }
  private mailNotificationExecAChunk(mails: ParsedMail[]) {
    if (mails.length === 0) {
      const embeds = mails.map((mail) => this.transformMailToEmbed(mail));
      const channels = this.core.channels.cache.filter((channel) => this.channelIds.includes(channel.id));
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
  }

  private async discordNotification(content?: string, mails?: ParsedMail[]) {
    const channelIds = this.channelIds;
    let result: (Message<boolean> | undefined)[] = [];
    let logMessage = '';
    if (!content && !mails) {
      result = await this.generalBroadcast(channelIds, {
        content: 'discordNotification => No content and mail',
      });
      const resultCount = result.reduce((prev, current) => {
        if (!current) return prev;
        return prev + 1;
      }, 0);
      //メールなし
      //コンテンツなし
      logMessage = `discordNotification => No content and mail ${resultCount} channels sent.`;
      logMessage = this.printInfo(logMessage);
    } else if (content && !mails) {
      result = await this.generalBroadcast(channelIds, {
        content,
      });
      const resultCount = result.reduce((prev, current) => {
        if (!current) return prev;
        return prev + 1;
      }, 0);
      //メールなし
      //コンテンツあり
      logMessage = `discordNotification => content : {${content}},mail${
        mails ? mails : 'undefined'
      } ${resultCount} channels sent.`;
      logMessage = this.printInfo(logMessage);
    } else if (mails) {
      //メールあり
      logMessage = `discordNotification => ${mails.length} mails`;
      logMessage = this.printInfo(logMessage);
      const embeds = mails.map((mail) => this.transformMailToEmbed(mail));
      const channels = this.core.channels.cache.filter((channel) => this.channelIds.includes(channel.id));
      result = await this.generalBroadcast(channelIds, {
        content: content ? content : 'generalBroadcast => Mail Notification',
        embeds,
      });
      const resultCount = result.reduce((prev, current) => {
        if (!current) return prev;
        return prev + 1;
      }, 0);
      logMessage = `discordNotification => ${resultCount} mails sent`;
      logMessage = this.printInfo(logMessage);
    } else {
      this.printError('discordNotification => Something wrong' + content);
      this.printError('discordNotification => Something wrong' + mails);
    }
  }
  private discordInformation(showPassword?: boolean) {
    const availableChannels = `Now Available Channels:\n${this.channelIds.map(util.genChannelString).join('\n')}`;
    const availableServers = `Now Available Servers:\n${this.serverConfigs
      .map((config) => `${config.user}@${config.host}${showPassword ? `:${config.password}` : ''}`)
      .join('\n')}`;
    const message = `${availableChannels}\n${availableServers}`;
    return message;
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
      if (e instanceof Error) {
        this.printError(`mailNotification::turnOn->${e.message}`);
      } else {
        this.printError(`mailNotification::turnOn->${e}`);
      }
    }
  }
  private turnOff(channelId: string) {
    try {
      this.removeChannelId(channelId);
      if (this.channelIds.length === 0) {
        this.setOffline();
      }
      return { ifRemoved: true, ifOnline: this.online };
    } catch (e) {
      if (e instanceof Error) {
        this.printError(`mailNotification::turnOff->${e.message}`);
      } else {
        this.printError(`mailNotification::turnOff->${e}`);
      }
      return { ifRemoved: false, ifOnline: this.online };
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
      //Modal Submitイベントの処理
      if (interaction.customId === 'mailserverModal') {
        await interaction.deferUpdate();
        await interaction.followUp('Mail server configuration running test ...');
        // ユーザー名、ホスト名、パスワードを取得
        const host = interaction.fields.getField('host').value;
        const user = interaction.fields.getField('user').value;
        const password = interaction.fields.getField('password').value;
        const config: ServerConfig = { host, user, password };
        const added = this.addServerConfig(config);
        if (added.user === user) {
          this.printInfo(`Modal:Submits:handler-> added a server config{${JSON.stringify(added)}}`);
          this.setOnline();
          await interaction.editReply({
            content: `[${user}@${host}](<${user}@${host}>) is online`,
          } as never);
        } else {
          this.printInfo(`Modal:Submits:handler-> failed to add a server config{${JSON.stringify(added)}}`);
          await interaction.editReply({
            content: 'Mail server configuration failed' + `${(added.user, added.host)}`,
          } as never);
        }
        // await interaction.editReply({
        //   content: 'Mail server configuration saved',
        // });
      }
      if (interaction.customId === 'removeServerModal') {
        let message: InteractionReplyOptions = {
          content: 'Mail server configuration removed',
        };
        try {
          const user = interaction.fields.getTextInputValue('user');
          const host = interaction.fields.getTextInputValue('host');
          const password = interaction.fields.getField('password').value;
          this.removeServerConfig({ user, host, password });
        } catch (e) {
          if (e instanceof Error) {
            this.printInfo(`Modal:Submits:handler-> failed to remove a server config${e.message}`);
            message = {
              content: 'Mail server configuration failed to remove',
            };
          } else {
            message = {
              content: 'Mail server configuration failed to remove',
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
      if (interaction.isAutocomplete() && interaction.commandName === 'mn_rm_mailconfig') {
        const focusedValue = interaction.options.getFocused();
        const serverConfigs = this.serverConfigs;
        const answer = serverConfigs.find((config) => `${config.host}:${config.user}`.includes(focusedValue));
        console.log(answer);
        const choices = serverConfigs.map((config) => ({
          name: `${config.user}@${config.host}`,
          value: `${config.host}:${config.user}`,
        }));
        // Log choices for human readability
        console.log(JSON.stringify(choices, null, 2));
        await interaction.respond(
          choices.filter((choice) => choice.name.toLowerCase().includes(focusedValue.toLowerCase()))
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
        const servers = `${this.serverConfigs.map(transformServerConfig).join('\n')}`;
        const availableServers = 'Now Available Servers:\n' + servers;
        await interaction.reply({
          content: `${result.ifRemoved ? 'Success' : 'Fail'} that remove notification with this channel.\n${
            result.ifOnline ? availableChannels + '\n' + availableServers : 'Now offline'
          }`,
        });
      },
    };
    const mn_show_status: Command = {
      data: new SlashCommandBuilder().setName('mn_show_status').setDescription('Show the status of mail notification.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        await interaction.reply({
          content: `${this.online ? this.discordInformation() : 'Now offline'}`,
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
        await interaction.reply({
          content: `${this.online ? this.discordInformation(true) : 'Now offline'}`,
        });
      },
    };
    const mn_add_mailconfiguration: Command = {
      data: new SlashCommandBuilder().setName('mn_add_mailconfig').setDescription('Set mail server information'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const modal = new ModalBuilder().setCustomId('mailserverModal').setTitle('Mail Server Information');
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
        const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(hostInput);
        const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(userInput);
        const thirdActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(passwordInput);
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
        await interaction.showModal(modal);
      },
    };
    const mn_rm_mailconfiguration: Command = {
      data: new SlashCommandBuilder().setName('mn_rm_mailconfig').setDescription('Remove a mail server configuration'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const modal = new ModalBuilder().setCustomId('removeServerModal').setTitle('Remove Mail Server Configuration');
        const userInput = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('User Name')
          .setStyle(TextInputStyle.Short);
        const hostInput = new TextInputBuilder().setCustomId('host').setLabel('Host').setStyle(TextInputStyle.Short);
        const passwordInput = new TextInputBuilder()
          .setCustomId('password')
          .setLabel('Password')
          .setStyle(TextInputStyle.Short);
        const actionRowUser = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(userInput);
        const actionRowHost = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(hostInput);
        const actionRowPassword = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(passwordInput);
        modal.addComponents(actionRowUser, actionRowHost, actionRowPassword);

        // モーダルを表示
        await interaction.showModal(modal);
      },
    };

    const mn_fetch: Command = {
      data: new SlashCommandBuilder().setName('mn_fetch').setDescription('Fetch mail'),
      execute: this.mailCronHandler.bind(this),
    };
    return [
      mn_turn_on,
      mn_turn_off,
      mn_show_status,
      mn_show_status_all,
      mn_add_mailconfiguration,
      mn_rm_mailconfiguration,
      mn_fetch,
    ];
  }
  //Division制約 events get - ():EventSet[]
  public get events() {
    return [this.handleModalSubmitEventSet, this.handleSelectMenuEventSet];
  }
}
