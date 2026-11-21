import type { DivineWorldSave } from './types';
export class WorldAccessSystem { static canAccess(world:DivineWorldSave,playerId:string,minimum:'observer'|'controller'='observer'){const rank={observer:0,controller:1,owner:2};const grant=world.access.find(x=>x.playerId===playerId);return !!grant&&rank[grant.role]>=rank[minimum]} }
