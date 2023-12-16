import { Client } from 'discord.js';

abstract class Component {
  public abstract name: string;
  public constructor(public commands: Command[], public eventSets: EventSet[]) {}
  public add(client: Client): Client {
    //command処理
    for (const eventSet of this.eventSets) {
      if (eventSet.once) {
        client.once(eventSet.event, eventSet.listener);
      } else {
        client.on(eventSet.event, eventSet.listener);
      }
    }
    return client;
  }
}
