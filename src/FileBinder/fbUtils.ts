// import fs from 'fs';
// import { FBBotData } from './types';
// import { Attachment, Collection } from 'discord.js';
// import path from 'path';
// //Collection<string, Attachment>

// type Attachments = Collection<string, Attachment>;

// const resolveFilename = (dataDir: string, filename: string): string => {
//   let filepath = path.join(dataDir, filename);
//   if (fs.existsSync(filepath)) {
//     const { basename, ext } = parseFilename(filename);
//     filepath = path.join(dataDir, `${basename}-${Date.now().toString()}.${ext}`);//TODOここの重複は一旦無視
//   }
//   return filepath;
// }

// const parseFilename = (filename: string): { basename: string, ext: string } => {
//   const parts = filename.split('.');
//   const ext = parts.pop() || '???';
//   const basename = parts.join('.');
//   return { basename, ext };
// }

// export const saveAttachmentIntoDataDir = async (option: { attachments: Attachments, dataDir: string, URL_PRESET?: string }) => {
//   const { attachments, dataDir, URL_PRESET } = option;
//   const results = attachments.map(async (attachment) => {
//     const filename = attachment.name;
//     const filepath = resolveFilename(dataDir, filename);
//     const buffer = await (await fetch(attachment.url)).arrayBuffer();
//     fs.writeFileSync(filepath, buffer);
//     if (!URL_PRESET) {
//       return { url: filepath, name: filename };
//     }
//     const fullURL = URL_PRESET + '/' + filepath;
//     return { url: fullURL, name: filename };
//   });
//   return Promise.all(results);
// };

// export const checkChannelId = (channelId: string) => {
//   const { monitors } = getData();
//   const ids = monitors.map(monitor => monitor.channelId);
//   return ids.includes(channelId);
// }


// export const getIds = () => {
//   const data:FBBotData = 
//   monitors.map(monitor => monitor.channelId);
// }

// export const addMonitor = (name: string, id: string) => {
//   const data = getData();
//   if (data.monitors.map(monitor => monitor.channelId).includes(id)) return false;
//   data.monitors.push({ name, channelId: id });
//   setData(data);
//   return true;
// }

// export const removeMonitor = (id: string) => {
//   const ifIncludes = getIds().includes(id);
//   const data = getData();
//   data.monitors = data.monitors.filter(monitor => monitor.channelId !== id);
//   setData(data);
//   return ifIncludes;
// }

// export const getAvailableChannels = () => {
//   const ids = getIds();
//   const message = `Now monitoring channels \n ${ids.map(id => `<#${id}>`).join('\n')}`;
//   return message;
// }
