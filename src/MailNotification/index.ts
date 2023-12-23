import fs from 'fs';
import path from 'path';
import { Channel, Events, SlashCommandBuilder } from 'discord.js';

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
  private channels: Channel[];
  constructor(core: Core) {
    super(core);
    if () {
    } else {
    }

    this.printInitMessage();
  }
}