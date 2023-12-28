import { SlashCommandBuilder } from 'discord.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
// global
import { Division } from '../Division';
import { Core } from '../Core';

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
    return [su_time];
  }
  //Division制約 events get - ():EventSet[]
  public get events(): EventSet[] {
    return [];
  }
}
