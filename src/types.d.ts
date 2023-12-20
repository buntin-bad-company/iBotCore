import { Client, CommandInteraction, SlashCommandBuilder, ClientEvents, Awaitable } from 'discord.js';

declare global {
  export type Command = {
    data: SlashCommandBuilder;
    execute: (i: CommandInteraction) => Promise<void>;
  };
  export type EventSet = {
    name?: string;
    once: boolean;
    event: keyof ClientEvents;
    listener: (...args: ClientEvents[event]) => Awaitable<void>;
  };
  export type FileStatus = { exists: boolean; isDirectory: boolean; isFile: boolean };
}
