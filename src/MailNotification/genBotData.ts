import fs from 'fs';
import { MNBotData } from './types';
const path = 'data/MailNotification/bot_data.json';

const blank: MNBotData = {
  color: '#000000',
  url: '',
  Author: {
    name: '',
    icon_url: '',
    url: '',
  },
  image: '',
};

try {
  fs.writeFileSync(path, JSON.stringify(blank, null, 2));
} catch (err) {
  console.error(err);
}
