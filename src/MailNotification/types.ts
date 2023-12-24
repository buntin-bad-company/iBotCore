import { ColorResolvable } from 'discord.js';

export type ServerConfig = {
  host: string;
  user: string;
  password: string;
};

export type MNBotData = {
  color: ColorResolvable;
  url: string;
  Author: {
    name: string;
    icon_url: string;
    url: string;
  };
  image: string;
};
