import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import ja from 'dayjs/locale/ja';
import { Core } from './Core';
import { checkPathSync } from './utils';
import { Message, MessageCreateOptions, MessagePayload } from 'discord.js';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('ja');
dayjs.tz.setDefault('Asia/Tokyo');

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
      throw new Error(`${this.name}::DataDir does not exist. [${this.division_data_dir}]`);
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
    const message_ = `iBotCore::${this.name} => ${message}  [${this.now()}]`;
    console.log(message_);
    return message_;
  }
  protected printError(message: string) {
    const message_ = `iBotCore::${this.name} => ${message} [${this.now()}]`;
    console.error(message_);
    return message_;
  }
  protected async generalBroadcast(
    ids: string[],
    options: string | MessagePayload | MessageCreateOptions
  ): Promise<(Message<boolean> | undefined)[]> {
    const messages: (Message<boolean> | undefined)[] = [];
    for (const id of ids) {
      let logMessage = '';
      try {
        const channel = this.core.channels.cache.get(id);
        if (!channel) {
          logMessage = `constructor::generalBroadcast : Channel not found. [${id}]`;
          logMessage = this.printError(logMessage);
          throw new Error(logMessage);
        } else if (!channel.isTextBased()) {
          logMessage = `constructor::generalBroadcast : Channel is not text based. current:[${channel.type.toString()}] [${id}]`;
          this.printError(logMessage);
          throw new Error(logMessage);
        }
        const message = await channel.send(options);
        messages.push(message);
      } catch (e: any) {
        this.printError(`constructor::generalBroadcast : Error occurred. [${id}] ${e.text}`);
        messages.push(undefined);
      }
    }
    return messages;
  }
  //TODO: channels: Collection<string, Channel>を、引数に取るgeneralBroadcast,castToChannelsを実装する。
  protected now(arg?: Date, template?: string) {
    return dayjs(arg)
      .locale(ja)
      .format(template || 'YYYY/MM/DD HH:mm:ss:SSS');
  }
}
