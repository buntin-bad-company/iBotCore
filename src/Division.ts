import { Core } from './Core';
import { checkPathSync } from './utils';

export abstract class Division {
  /*
  Divisionが持つ機能。
  名前とそれに応じたDiscordに実装する様々な機能をペアとして、一つの処理単位としてモジュール化する。
  これをCoreインスタンスが実際に実行する。
  各種機能に応じたスラッシュコマンドを登録可能。
  インスタンス内で組み込んで、名前の重複があった場合その時点でエラーを投げる。なぜかというと、DiscordAPI呼び出しで百パーセントバグるから。
  各種コマンドの名前解決、重複検知は、実際に保存してあるオブジェクトのコレクションを、逐次走査する形式で実装。名前実際のマップを同期する機能はエラーのものになりそうだから。
  重複なしで、追加できれば良い。Divisiondごとに処理が失敗した場合の通知、再起動などをDiscord上から行える処理を考えているため、処理単位については気を付ける。

  p::name:string
  ronly::core:Core
  p::commands:Command[]
  p::eventSets:EventSet[]
  p:: division_data_dir: string
  */
  public name: string;
  readonly core: Core;
  protected commands: Command[] = [];
  protected eventSets: EventSet[] = [];
  protected division_data_dir: string;
  public constructor(core: Core) {
    this.core = core;
    this.name = this.constructor.name;
    this.division_data_dir = `./data/${this.name}`;
    const dataDirStatus = checkPathSync(this.division_data_dir);
    if (!(dataDirStatus.exists && dataDirStatus.isDirectory)) {
      throw new Error(
        `${this.name}::DataDir does not exist. [${this.division_data_dir}]`
      );
    }
  }
  protected printInitMessage() {
    this.printInfo(`Initialized.${this.name}`);
    this.printInfo(`SlashCommands: ${this.slashCommands.length}`);
    this.printInfo(`Events: ${this.events.length}`);
  }
  abstract get slashCommands(): Command[];
  abstract get events(): EventSet[];
  protected printInfo(message: string) {
    const message_ = `iBotCore::${this.name} => ${message}`;
    console.log(message_);
    return message_;
  }
}
