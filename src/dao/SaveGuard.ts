/** Detect a competing tab before writing a snapshot. Never overwrite an unseen revision. */
export class SaveGuard {
  private last:string|null;
  constructor(private readonly storage:Pick<Storage,'getItem'|'setItem'>,private readonly key:string){this.last=storage.getItem(key)}
  write(value:string){if(this.storage.getItem(this.key)!==this.last)return false;this.storage.setItem(this.key,value);this.last=value;return true}
}
