import fs from 'fs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ja from 'dayjs/locale/ja';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ja');
dayjs.tz.setDefault('Asia/Tokyo');

export const isValidCommandName = (s: string): boolean => {
  const pattern = /^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u;
  return pattern.test(s);
};

export const checkPathSync = (path: string): FileStatus => {
  try {
    const stats = fs.statSync(path);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (error) {
    // エラーが発生した場合、パスは存在しないかアクセスできないと仮定
    return {
      exists: false,
      isDirectory: false,
      isFile: false,
    };
  }
};

export const readJsonFile = <T>(path: string): T | undefined => {
  try {
    if (!fs.existsSync(path)) {
      return undefined;
    }
    const data = fs.readFileSync(path, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    return undefined;
  }
};

export const writeJsonFile = (path: string, data: any) => fs.writeFileSync(path, JSON.stringify(data));

export const genChannelString = (id: string | number) => `<#${id.toString()}>`;

export const splitArrayIntoChunks = <T>(originalArray: T[], chunkSize: number = 10): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < originalArray.length; i += chunkSize) {
    const chunk = originalArray.slice(i, i + chunkSize);
    result.push(chunk);
  }
  return result;
};

type GeneralConfig = {
  ifRegister: boolean;
  token?: string;
  clientId?: string;
  guildId?: string;
};

export const systemFirstRunnerEnvManager = (): GeneralConfig => {
  const argv = Bun.argv;

  const ifRegister = argv.includes('--register') || argv.includes('-r');
  const token = Bun.env.TOKEN;
  const clientId = Bun.env.CLIENT_ID;
  const guildId = Bun.env.GUILD_ID;
  return {
    ifRegister,
    token,
    clientId,
    guildId,
  };
};

export const now = (arg?: Date, template?: string) => {
  return dayjs(arg)
    .locale(ja)
    .format(template || 'YYYY/MM/DD HH:mm:ss:SSS');
};
