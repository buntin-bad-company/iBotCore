import { Collection,Attachment } from 'discord.js';
export type  Monitor =  {
  name: string;
  channelId: string;
};

/* 
{
  "monitors": []
}
*/
export type  FBBotData =  {
  monitors: Monitor[];
} 

export type Attachments = Collection<string, Attachment>;