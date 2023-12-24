import fs from 'fs';
import { FBBotData } from './types';
const path = './data/FileBinder/bot_data.json';

const blank: FBBotData = {
  monitors: [],
};

try {
  fs.writeFileSync(path, JSON.stringify(blank, null, 2));
} catch (err) {
  console.error(err);
}
