/** Detect a competing tab before writing a snapshot. Never overwrite an unseen revision. */
export class SaveGuard {
  private last:string|null;
  constructor(private readonly storage:Pick<Storage,'getItem'|'setItem'>,private readonly key:string){this.last=storage.getItem(key)}
  acceptExternal<T>(value:string,verify:(previous:string|null,next:string)=>T|null):T|null{
    if(this.storage.getItem(this.key)!==value)return null;
    const change=verify(this.last,value);
    if(change===null)return null;
    this.last=value;
    return change;
  }
  write(value:string){if(this.storage.getItem(this.key)!==this.last)return false;this.storage.setItem(this.key,value);this.last=value;return true}
}
