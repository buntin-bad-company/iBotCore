import fs from 'fs';
import path from 'path';
import { Events, SlashCommandBuilder } from 'discord.js';


import { Division } from '../Division';
import { Core } from '../Core';


class FileBinder extends Division {
  private bindingDir :string;
  private fileBinderDivData:string;
  constructor(core: Core) {
    const name = 'FileBinder';
    super(core, name);
    const dataDir = Bun.env.FILE_BINDER_DATA_DIR!;
    const botData = Bun.env.FILE_BINDER_BOT_DATA!;
    const urlPreset = Bun.env.FILE_BINDER_URL_PRESET!;

    this.bindingDir = path.join(this.division_data_dir,dataDir);
    if (!fs.existsSync(this.bindingDir)) {
      throw new Error('Please provide a valid data directory.');
    } else {
      this.printInfo(`Binding Data Dir exists: ${dataDir}`);
    }
    this.fileBinderDivData = path.join(this.division_data_dir,botData);
    if (!fs.existsSync(this.fileBinderDivData)) {
      throw new Error('Please provide a valid bot data file.');
    } else {
      this.printInfo(`Bot data file exists: ${botData}`);
    }
  }
  public get slashCommands() {
    //fb_turn_on;
    const turn_on: Command = {
      data: new SlashCommandBuilder()
        .setName('fb_turn_on')
        .setDescription('iBotCore::FileBinder\nturn on file binding with this channel'),
      execute: (interaction) => {
        const channel = interaction.channel;
        if (!channel || channel.type !== 0) return;
        const { id, name } = channel;
        const result;
      },
    };
    return [] as Command[];
  }
}
