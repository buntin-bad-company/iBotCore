
import { Core } from "./Core";
import { checkPathSync } from "./utils";



export abstract class Division {
  /* 
  Divisionが持つ機能。
  名前とそれに応じたDiscordに実装する様々な機能をペアとして、一つの処理単位としてモジュール化する。
  これをCoreインスタンスが実際に実行する。
  各種機能に応じたスラッシュコマンドを登録可能。
  インスタンス内で組み込んで、名前の重複があった場合その時点でエラーを投げる。なぜかというと、DiscordAPI呼び出しで百パーセントバグるから。
  各種コマンドの名前解決、重複検知は、実際に保存してあるオブジェクトのコレクションを、逐次走査する形式で実装。名前実際のマップを同期する機能はエラーのものになりそうだから。
  重複なしで、追加できれば良い。Divisiondごとに処理が失敗した場合の通知、再起動などをDisocrd上から行える処理を考えているため、処理単位については気を付ける。
  */
  public name: string;
  readonly core: Core;
  protected commands: Command[] = [];
  protected eventSets: EventSet[] = [];
  protected division_data_dir:string;
  public constructor(core:Core,name: string) {
    this.core = core;
    this.name = name;
    this.division_data_dir = `./${name}`;
    const dataDirStatus = checkPathSync(this.division_data_dir);
    if(!(dataDirStatus.exists && dataDirStatus.isDirectory)) {
      throw new Error(`${this.name}::DataDir does not exist.`);
    }
  }
  abstract get slashCommands(): Command[];
  abstract get events(): EventSet[];
  protected printInfo(message:string) {
    console.log(`iBotCore::${this.name} => ${message}`)
  }
}
