import {
  Client,
  CommandInteraction,
  SlashCommandBuilder,
  ClientEvents,
  Awaitable,
  Interaction,
} from 'discord.js';

declare global {
  export type Command = {
    data: SlashCommandBuilder;
    execute: (i: CommandInteraction) => Promise<void>;
  };

  interface GenericEventSet<K extends keyof ClientEvents> {
    name: string;
    once: boolean;
    event: K;
    listener: (...args: ClientEvents[K]) => Awaitable<void>;
  }

  interface InteractionCreateEventSet
    extends GenericEventSet<'interactionCreate'> {
    listener: (interaction: Interaction) => Awaitable<void>;
  }

  export type EventSet =
    | GenericEventSet<keyof ClientEvents>
    | InteractionCreateEventSet;
  export type FileStatus = {
    exists: boolean;
    isDirectory: boolean;
    isFile: boolean;
  };
}
