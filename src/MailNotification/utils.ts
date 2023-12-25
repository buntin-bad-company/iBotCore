import { EmbedBuilder } from 'discord.js';
import imap from 'imap';
import { promisify } from 'node:util';
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

export const testIMAPConnection = async (
  host: string,
  user: string,
  password: string
): Promise<boolean> => {
  const imapConfig = new imap({
    user: user,
    password: password,
    host: host,
    port: 993, // IMAPのSSL接続用ポート、必要に応じて変更
    tls: true,
  });
  try {
    const connect = promisify(imapConfig.connect).bind(imapConfig);
    const end = promisify(imapConfig.end).bind(imapConfig);
    await connect();
    await end();
    return true; // 接続成功
  } catch (error) {
    console.error('IMAP接続エラー:', error);
  }
  return false; // 接続失敗
};
