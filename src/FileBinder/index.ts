import { Events, SlashCommandBuilder } from 'discord.js';

import { Division } from '../Division';
import { Core } from '../Core';

class FileBinder extends Division {
  constructor(core: Core) {
    const name = 'FileBinder';
    super(core, name);
  }
  get slashCommands {
    //fb_turn_on;
    const turn_on:Command = {
      data: new SlashCommandBuilder().setName('fb_turn_on').setDescription('iBotCore::FileBinder\nturn on file binding with this channel'),
      execute: (interaction) => {
        const channel = interaction.channel;
        if (!channel || channel.type !== 0) return;
        const { id,name} = channel;
        const result
      }
    }
  }
}
