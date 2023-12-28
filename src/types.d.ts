// types.d.ts
import { SlashCommandBuilder, CommandInteraction, ClientEvents, Awaitable, Interaction, Events } from 'discord.js';

declare global {
  // コマンド関連
  export type Command = {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>; // 修正
    execute: (i: CommandInteraction) => Promise<void>;
  };

  // イベント関連
  interface GenericEventSet<K extends keyof ClientEvents> {
    name: string;
    once: boolean;
    event: K;
    listener: (...args: ClientEvents[K]) => Awaitable<void>;
  }

  export type EventSet = GenericEventSet<keyof ClientEvents> | InteractionCreateEventSet;

  export type FileStatus = {
    exists: boolean;
    isDirectory: boolean;
    isFile: boolean;
  };

  interface InteractionCreateEventSet extends GenericEventSet<Events.InteractionCreate> {
    listener: (interaction: Interaction) => Awaitable<void>;
  }
}
