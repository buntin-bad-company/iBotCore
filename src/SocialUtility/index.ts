import { SlashCommandBuilder } from 'discord.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// global
import { Division } from '../Division';
import { Core } from '../Core';
import { MailNotification } from '../MailNotification';

//local
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ja');
dayjs.tz.setDefault('Asia/Tokyo');

export class SocialUtility extends Division {
  /* 
  p::name:string
  ronly::core:Core
  p::commands:Command[]
  p::eventSets:EventSet[]
  p:: division_data_dir: string
  */
  constructor(core: Core) {
    super(core);
    const logMessage = 'Constructor: SocialUtility Online';
    this.printInfo(logMessage);
    this.printInitMessage();
  }
  /* 
================================================================================================================================================
*/

  /* 
================================================================================================================================================
*/
  //Division制約 slashCommands get - ():Command[]
  public get slashCommands(): Command[] {
    //su_builtIn
    const su_time: Command = {
      data: new SlashCommandBuilder().setName('su_time').setDescription('Check Server is going well.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        const channelId = interaction.channelId;
        if (!channelId) interaction.reply('channelId is undefined');
        const now = dayjs();
        const times = [
          { place: '東京', time: now.format('HH:mm:ss') },
          { place: '上海', time: now.tz('Asia/Shanghai').format('HH:mm:ss') },
          {
            place: 'ロサンゼルス',
            time: now.tz('America/Los_Angeles').format('HH:mm:ss'),
          },
          {
            place: 'ニューヨーク',
            time: now.tz('America/New_York').format('HH:mm:ss'),
          },
          {
            place: 'ロンドン',
            time: now.tz('Europe/London').format('HH:mm:ss'),
          },
          {
            place: 'モスクワ',
            time: now.tz('Europe/Moscow').format('HH:mm:ss'),
          },
          { place: 'UNIX', time: now.unix().toString() },
        ];
        let message = '現在の時刻:\n';
        times.forEach((t) => {
          message += `${t.place}: ${t.time}\n`;
        });
        await interaction.reply(message);
      },
    };
    //su_mailNotification
    const su_mailnotification_purge_db: Command = {
      data: new SlashCommandBuilder()
        .setName('su_mailnotification_purge_db')
        .setDescription('Purge MailNotification DB.'),
      execute: async (interaction) => {
        await interaction.deferReply();
        let logMessage = 'su_mailnotification_purge_db : SlashCommand is called';
        logMessage = this.printInfo(logMessage);
        try {
          const mailNotificationDivisionInstance = this.core.divisions.get('MailNotification');
          if (!mailNotificationDivisionInstance) {
            logMessage = this.printError('su_mailnotification_purge_db : MailNotification Division is undefined');
            throw new Error('MailNotification Division is undefined');
          }
          const mailNotification = mailNotificationDivisionInstance as MailNotification;
          // .mailNotification.purgeDB();
          mailNotification.purgeDB();
          // await interaction.reply(result);
          logMessage = this.printInfo('su_mailnotification_purge_db : DB is purged');
        } catch (e) {
          if (e instanceof Error) {
            logMessage = this.printError(`[ERROR]su_mailnotification_purge_db : ${e.message}`);
          } else {
            logMessage = this.printError(`[ERROR]su_mailnotification_purge_db : ${e}`);
          }
        } finally {
          const result = await interaction.editReply(logMessage);
          logMessage = this.printInfo(`su_mailnotification_purge_db : ${result.content}`);
        }
      },
    };
    const su_mailnotification_show_db_info: Command = {
      data: new SlashCommandBuilder()
        .setName('su_mailnotification_show_db_info')
        .setDescription('Show database file information.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        let logMessage = 'su_mailnotification_show_db_info : SlashCommand is called';
        logMessage = this.printInfo(logMessage);
        /*
        Typescript Type Slice 
         */
        await interaction.deferReply();

        const channelId = interaction.channelId;

        const mailNotificationDivisionInstance = this.core.divisions.get('MailNotification');
        if (!mailNotificationDivisionInstance) {
          logMessage = this.printError('su_mailnotification_show_db_info : MailNotification Division is undefined');
          const result = await interaction.editReply(logMessage);
          logMessage = this.printInfo(`su_mailnotification_show_db_info : ${result.content}`);
        }
        const channel = this.core.channels.cache.get(channelId);
        if (!channel) {
          logMessage = this.printError('su_mailnotification_show_db_info : channel is undefined');
          const result = await interaction.editReply(logMessage);
        }
        const mailNotification = mailNotificationDivisionInstance as MailNotification;
        const excuseResult = await mailNotification.disclosureDatabases();
        await interaction.editReply(`SocialUtility::su_mailnotification_show_db_info\n${excuseResult}\n`);
      },
    };
    const su_java_runtime_info: Command = {
      data: new SlashCommandBuilder().setName('su_java_runtime_info').setDescription('Show java runtime information.'),
      execute: async (interaction) => {
        if (!interaction.isCommand()) return;
        let logMessage = 'su_java_runtime_info : SlashCommand is called';
        logMessage = this.printInfo(logMessage);
        /*
        Typescript Type Slice 
         */
        await interaction.deferReply();

        const excuseResult = (await $`java src/SocialUtility/MotdServer.java`).toString();
        await interaction.editReply(`SocialUtility::su_java_runtime_info\n${excuseResult}\n`);
      },
    };
    //Main
    const invite: Command = {
      data: new SlashCommandBuilder().setName('invite').setDescription('Invite this bot to your server.'),
      execute: async (interaction) => {
        const clientId = this.core.coreClientId;
        await interaction.reply({
          content: `https://discord.com/api/oauth2/authorize?client_id=${this.core.coreClientId}&permissions=8&scope=bot%20applications.commands`,
          ephemeral: true,
        });
      },
    };
    return [su_time, su_mailnotification_show_db_info, su_mailnotification_purge_db, su_java_runtime_info, invite];
  }
  //Division制約 events get - ():EventSet[]
  public get events(): EventSet[] {
    return [];
  }
}
