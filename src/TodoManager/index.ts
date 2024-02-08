import { join } from 'path';
//channel as todo機能
import { Division } from '../Division';
import { Core } from '../Core';
import * as util from '../utils';

type TodoManagerData = {
  webuiUrlPreset: string;
  webuiDefaultMode: string;
  todoChannelIds: string[];
};
export class TodoManager extends Division {
  private dataPath: string;
  constructor(core: Core) {
    super(core);
    const botData = Bun.env.TODO_MANAGER_BOT_DATA;
    if (!botData) throw new Error('botData is not set.');
    const dataDir = this.division_data_dir;
    this.dataPath = join(dataDir, botData);
  }
  get data() {
    return util.readJsonFile<TodoManagerData>(this.dataPath);
  }
  //Division制約 slashCommands get - ():Command[]
  public get slashCommands() {
    const commands: Command[] = [];
    return commands;
  }
  //Division制約 events get - ():EventSet[]
  public get events() {
    return [];
  }
}
