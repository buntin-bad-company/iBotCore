import * as fs from 'fs';

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

export const readJsonFile = <T>(path: string): T | null => {
  try {
    if (!fs.existsSync(path)) {
      return null;
    }
    const data = fs.readFileSync(path, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    return null;
  }
};

export const writeJsonFile = (path: string, data: any) =>
  fs.writeFileSync(path, JSON.stringify(data));

export const genChannelString = (id: string | number) => `<#${id.toString()}>`;
