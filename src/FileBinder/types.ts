import { Collection, Attachment } from 'discord.js';
export type Monitor = {
  name: string;
  channelId: string;
};

export type FBBotData = {
  monitors: Monitor[];
};

export type Attachments = Collection<string, Attachment>;
