import { EmbedBuilder } from 'discord.js';
import { Core } from '../Core';

import { MNBotData, ServerConfig } from './types';
export const genServerConfigEmbed = (serverConfig: ServerConfig) => {
  const { host, user } = serverConfig;
};

export const genMNEmbed = (
  title: string,
  description: string,
  bot_data: MNBotData
) => {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setAuthor({
      name: bot_data.Author.name,
      iconURL: bot_data.Author.icon_url,
      url: bot_data.Author.url,
    })
    .setColor(bot_data.color)
    .setImage(bot_data.image);
  return embed;
};

export const transformServerConfig = (config: ServerConfig): string => {
  return `${config.user}@${config.host}<${config.user}.${config.host}>`;
};
