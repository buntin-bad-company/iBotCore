import { Core } from './Core';
import { checkPathSync, now } from './utils';
import { Channel, Message, MessageCreateOptions, MessagePayload } from 'discord.js';

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
  protected printInfo(message?: string, notPush?: boolean) {
    const message_ = `[${now()}] iBotCore::${this.name} => ${message || 'undefined'}`;
    if (!notPush) console.log(message_);
    return message_;
  }
  protected printError(message: string) {
    const message_ = `[${now()}] iBotCore::${this.name} => ${message}`;
    console.error(message_);
    return message_;
  }
  protected async generalBroadcast(
    ids: string[],
    options: string | MessagePayload | MessageCreateOptions
  ): Promise<(Message<true> | Message<false>)[]> {
    const messages: (Message<true> | Message<false>)[] = [];
    for (const id of ids) {
      //[division.generalBroadcast.channel]
      let logMessage = '';
      try {
        const channel = this.core.channels.cache.get(id);
        if (!channel) {
          logMessage = `[ERROR]constructor::generalBroadcast : Channel not found. [${id}][division.generalBroadcast.channel.undefined]`;
          logMessage = this.printError(logMessage);
          continue;
        } else if (!channel.isTextBased()) {
          logMessage = `constructor::generalBroadcast : Channel is not text based. current:[${channel.type.toString()}] [${id}][division.generalBroadcast.channel.notTextBased]`;
          this.printError(logMessage);
          continue;
        }
        //channel is TextBasedChannel
        const message = await channel.send(options);
        messages.push(message);
      } catch (e) {
        if (e instanceof Error) {
          logMessage = this.printError(
            `constructor::generalBroadcast : Error occurred. [${id}] ${e.message} [division.generalBroadcast.channel.error]`
          );
        }
        continue;
      }
    }
    return messages;
  }
  //TODO: channels: Collection<string, Channel>を、引数に取るgeneralBroadcast,castToChannelsを実装する。
  protected getChannelById(channelId: string): Channel | undefined {
    const channel = this.core.channels.cache.get(channelId);
    if (!channel) {
      this.printError(`Channel with ID ${channelId} not found.`);
      return undefined;
    }
    return channel;
  }
}
