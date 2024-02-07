//Bun
import Database, { Statement } from 'bun:sqlite';
//channel as todo機能
import { Division } from '../Division';
import { Core } from '../Core';

import * as util from '../utils';

type BotData = {

}

export class TodoManager extends Division {
  constructor(core: Core) {
    super(core);
  };
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
