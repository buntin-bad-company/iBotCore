import { Client } from 'discord.js';

abstract class Component {
  public abstract name: string;
  public constructor(public commands: Command[], public eventSets: EventSet[]) {}
  public abstract add(client: Client): Client;
}
