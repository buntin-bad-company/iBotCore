type Monitor = {
  name: string;
  channelId: string;
};

/* 
{
  "monitors": []
}
*/
export type BotData = {
  monitors: Monitor[];
} 