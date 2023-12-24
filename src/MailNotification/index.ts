import fs from 'fs';
import path from 'path';
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
  private client: Elysia | null = null;
  constructor(core: Core) {
    super(core);
    this.online = false;
    this.channelIds = [];
    // if () {
    // } else {
    // }

    this.printInitMessage();
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
  }
  private mailNotification() {
    console.log('mail-notification');
  }
  private setOffline() {
    this.online = false;
    this.client = null;
  }
  private turnOn(channelId: string) {
    this.channelIds.push(channelId);
    if (!this.online) {
      this.setOnline();
    }
  }
  private turnOff(channelId: string) {
    this.channelIds = this.channelIds.filter((id) => id !== channelId);
    if (this.channelIds.length === 0) {
      this.setOffline();
    }
  }

  public get slashCommands() {
    return [] as Command[];
  }
  public get events() {
    return [] as EventSet[];
  }
}
