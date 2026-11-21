import type { SimNPC } from './types';
export type HeavenlyDisclosure='identity'|'realm'|'treasure'|'talent'|'achievement'|'approximate-location';
export interface HeavenlyBoardEntry {npcId:string;disclosed:HeavenlyDisclosure[];publishedDay:number;approximateRegion?:string;}
export interface HeavenlyBoardBulletin {id:string;publishedDay:number;headline:string;entries:HeavenlyBoardEntry[];}
/** Data contract for a future reactive ranking/revelation system; no publication UI is wired in Part 4A. */
export function recordDisclosure(entry:HeavenlyBoardEntry,npc:SimNPC){npc.memories.push({day:entry.publishedDay,text:`Thiên Bảng đã công bố: ${entry.disclosed.join(', ')}.`,kind:'heavenly-board'});if(entry.disclosed.includes('treasure'))npc.mood=Math.min(100,npc.mood+2);if(entry.disclosed.includes('identity')&&npc.personality==='cô độc')npc.mood=Math.max(0,npc.mood-2)}
