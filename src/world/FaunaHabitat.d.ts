type HabitatBase = { territories?: Partial<Record<string, unknown>> };
export function faunaHabitat<T extends HabitatBase>(zone:T,species:string):T;
export function faunaHabitat<T extends HabitatBase>(zone:T|undefined,species:string):T|undefined;
