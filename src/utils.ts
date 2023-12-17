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
