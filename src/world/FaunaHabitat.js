/** A species has one habitat inside each parent zone. The parent ID owns save and respawn slots. */
export const faunaHabitat=(zone,species)=>zone?.territories?.[species]??zone;
