import type { CultivationSave, SpiritualRootId, TechniqueId } from '../systems/CultivationTypes';

export type NPCAction = 'idle'|'travel'|'rest'|'cultivate'|'gather'|'eat'|'socialize'|'trade'|'guard'|'flee'|'fight'|'farm'|'work'|'patrol'|'shop'|'recruit'|'mission'|'teach'|'commission';
export type NPCProfession = 'tu_si'|'dan_su'|'thuong_nhan'|'duoc_su'|'ho_ve'|'dan_thuong'|'tho_re'|'nong_dan';
export type PopulationRole='commoner'|'low_disciple'|'elder'|'sect_leader'|'merchant'|'tavern_staff'|'city_guard'|'repair_worker'|'hunter'|'herb_gatherer'|'quest_clerk'|'independent_cultivator';
export type NPCAuthorityRole='city_master'|'sect_leader'|'elder'|'city_guard';
export type Personality = 'điềm tĩnh'|'tham vọng'|'hào sảng'|'cẩn trọng'|'hiếu kỳ'|'cô độc'|'nhân hậu'|'thực tế';
export interface NPCItemStack { itemId:string; count:number; }
export interface NPCMemory { day:number; text:string; kind:string; sourceId?:string; knownThrough?:string; otherId?:string; itemId?:string; }
export interface NPCAIProfile {seed:number;origin:string;familyCircumstance:string;socialClass:'bần hàn'|'bình dân'|'khá giả';axes:{diligence:number;courage:number;ambition:number;generosity:number;sociability:number;caution:number;discipline:number};}
export interface NPCAIDecision {at:number;action:NPCAction;reason:string;scores:Array<{action:NPCAction;score:number}>;}
export interface NPCKnownFact {id:string;kind:string;sourceId:string;knownThrough:'direct'|'heavenly-board'|'witnessed'|'told';day:number;minute:number;itemId?:string;otherId?:string;}
export interface NPCCausalOpinion {id:string;kind:string;sourceIds:string[];description:string;day:number;minute:number;}
export type HeavenlyAlignment='thuan_thien'|'vo_vi'|'nghich_thien';
export interface HeavenlyCause {sourceId:string;type:string;impact:number;day:number;minute:number;description:string;parentSourceId?:string;}
export interface HeavenlyDisposition {alignment:HeavenlyAlignment;trust:number;resentment:number;independence:number;lastChangeAt:number;aware:boolean;causes:HeavenlyCause[];appliedIds:string[];}
export interface SimNPC {
  id:string; name:string; age:number; lifespan:number; gender:'nam'|'nữ'; appearance:'cultivator'|'steward';
  x:number; y:number; realmIndex:number; realmLevel:number; xp:number; spiritualRoot:SpiritualRootId; technique:TechniqueId;
  techniqueMastery:Record<TechniqueId,number>; techniqueProgress:Record<TechniqueId,number>;
  hp:number; mp:number; personality:Personality; ambition:string; hunger:number; fatigue:number; mood:number;
  spiritStones:number; inventory:NPCItemStack[]; profession:NPCProfession; faction:string; relationships:Record<string,number>;
  shortGoal:string; longGoal:string; action:NPCAction; goalAction:NPCAction; actionTarget:{x:number;y:number}; actionProgress:number; actionCooldown:number;
  schedule:{hour:number; action:NPCAction}[]; memories:NPCMemory[]; marked:boolean; alive:boolean; skills?:string[]; ascended?:boolean;
  homeId?:string; home?:{x:number;y:number}; employerId?:string; safety:number; traits:Record<string,number>; lastTradeAt?:number; decisionSlot?:string;
  assignedCommissionId?:string|null; lastCommissionBoardVisitDay?:number;
  talent?:number; sectRank?:SectRank; mentorId?:string|null; loyalty?:number; merit?:number; sectCooldownDay?:number; assignedMissionId?:string|null; equippedWeapon?:string|null; deathCause?:string; notoriety?:number; grudges?:Record<string,number>; visualStyleId?:string; visualParts?:{bodyId:string;faceId:string;hairId:string;hairColorId:string;outfitId:string;accessoryIds:string[]}; heavenlyDisposition?:HeavenlyDisposition; knownFacts?:NPCKnownFact[]; causalOpinions?:NPCCausalOpinion[];
  aiProfile?:NPCAIProfile; aiDecision?:NPCAIDecision; populationRole?:PopulationRole; populationDuty?:string; authorityRole?:NPCAuthorityRole; authorityScope?:'city'|'sect';
  spawnRegionId?:string;workplaceId?:string;stallId?:string;guardPostId?:string;workPosition?:{x:number;y:number};patrolPoints?:{x:number;y:number}[];patrolIndex?:number;pathBlocked?:boolean;lawResponse?:{incidentId:string;status:'responding'|'at-scene';targetId:string;returnTarget?:{x:number;y:number}};
  activeHeavenSkill?:string|null; heavenSkillReadyAt?:number; heavenGuardUntil?:number;
  assignedResourceNodeId?:string;faunaHuntTargetId?:string;faunaHuntLimitDay?:number;faunaHuntsToday?:number;professionTask?:{kind:'repair'|'herb-gather';targetId:string;state:'seeking'|'travelling'|'working'|'blocked';lastReason?:string;inventoryBefore?:number};
}
export type NPCCultivation = Pick<CultivationSave,'realmIndex'|'realmLevel'|'xp'|'spiritualRoot'|'technique'|'techniqueMastery'|'techniqueProgress'>;
export interface WorldClockSave { day:number; minute:number; speed:1|2|4; paused:boolean; }
export interface PossessionSave { npcId:string; remainingMs:number; paidCycles:number; }
export interface HeavenShopEntry { id:string; itemId:string; price:number; boughtAt:number; owner:string; giftedTo?:string; giftedAt?:number; consumedAt?:number; }
export interface HeavenSave { shopLedger?:HeavenShopEntry[]; level:number; qi:number; qiMax:number; fragments:number; unlocked:string[]; markedNPCs:string[]; followedNPC:string|null; blessingDay:number; blessingCount:number; introSeen:boolean; divinePower:number; divinePowerMax:number; resourceMigrationVersion:number; possession:PossessionSave|null; mode:'heavenly'|'possessing'|'immortal'; playerId:string; originWorldId:string; ascendedCultivators:string[]; activeAscendedId:string|null; giftTransactions?:string[]; lightningReadyAt?:number; }
export type WorldEventStatus='occurred'|'completed'|'rewarded'|'failed';
export interface WorldEvent { id:string; minute:number; day:number; type:string; actorId?:string; targetId?:string; description:string; status?:WorldEventStatus; data?:Record<string,unknown>; }
export interface WorldAccess { playerId:string; role:'owner'|'observer'|'controller'; }
export interface AscendedCultivatorRecord { id:string; npc:SimNPC; originWorldId:string; playerId:string; ascendedAtDay:number; status:'ascended'|'dead'; }
export interface BeastSiegeSave { id:string; day:number; remaining:number; remainingMinutes:number; status:'occurred'|'completed'|'failed'|'rewarded'; }
export type TradeItemId='ration'|'rice_seed'|'wood'|'iron_ore'|'spirit_herb'|'wolf_pelt'|'wolf_fang'|'demon_core'|'deer_meat'|'scorpion_venom'|'snake_skin'|'qi_pill'|'iron_sword'|'iron_dao'|'mortal_gift_sword'|'qingfeng_sword';
export interface MarketStock { itemId:TradeItemId; count:number; }
export interface ShopSave { id:string; name:string; ownerId:string; areaId:string; openHour:number; closeHour:number; cash:number; stock:MarketStock[]; buyPrices:Partial<Record<TradeItemId,number>>; sellPrices:Partial<Record<TradeItemId,number>>; }
export interface TradeRecord { id:string; day:number; minute:number; buyerId:string; sellerId:string; shopId?:string; itemId:TradeItemId; count:number; unitPrice:number; }
export interface FactionSave { id:string; name:string; type:'city'|'sect'|'village'|'guild'; leaderId:string|null; memberIds:string[]; areaId:string; treasury:MarketStock[]; wealth:number; relations:Record<string,number>; security:number; reputation:number; power:number; territory:string[]; }
export interface SettlementSave { id:string; name:string; populationLimit:number; food:number; materials:MarketStock[]; security:number; guardCaptainId:string|null; lastSiegeDay:number; cityMasterId?:string; }
export type EnvironmentStatus='intact'|'damaged'|'destroyed'|'repairing';
export interface EnvironmentObjectSave {id:string;kind:'house'|'tree';x:number;y:number;maxHp:number;hp:number;defense:number;status:EnvironmentStatus;ownerFactionId?:string;collision:{x:number;y:number;width:number;height:number}|null;restoreCollision?:{x:number;y:number;width:number;height:number};hitbox:{x:number;y:number;width:number;height:number};repairable:boolean;destroyedAtDay?:number;regrowAfterDay?:number;repairProgress:number;repairWorkerId?:string;repairGeneration?:number;mapObjectId?:number;repairSite?:{x:number;y:number};}
export interface GroundDropSave {id:string;itemId:TradeItemId;count:number;x:number;y:number;sourceId:string;createdDay:number;createdMinute:number;status:'ground'|'claimed';claimedBy?:string;claimedEventId?:string;}
export interface ResourceNodeSave {id:string;kind:'herb';itemId:'spirit_herb';x:number;y:number;amount:number;maxAmount:number;danger:number;reservedBy?:string;depletedAt?:number;}
export type FaunaSpecies='deer'|'scorpion'|'snake';
export interface FaunaSave {id:string;species:FaunaSpecies;x:number;y:number;hp:number;maxHp:number;zoneId:string;alive:boolean;state:'idle'|'walk'|'flee'|'attack'|'hit'|'dead';targetNpcId?:string;roamTarget?:{x:number;y:number};fleeUntil?:number;attackReadyAt:number;nextThinkAt:number;lootCreated:boolean;deathAt?:number;respawnStatus?:'pending'|'fulfilled';}
export interface FaunaRespawnSave {id:string;zoneId:string;sourceDeathId:string;requestedAtMs:number;dueAtMs:number;attempts:number;lastFailure?:string;}
export interface FaunaRespawnZoneStats {totalSpawned:number;failedAttempts:number;lastFailure?:string;lastSpawnAtMs?:number;}
export interface RiverFishSave {id:string;species:'common'|'spirit';x:number;y:number;seed:number;component:number;depthState:'surface-near'|'diving'|'deep-swim'|'rising';phaseMs:number;targetX?:number;targetY?:number;invalidReason?:string;caughtBy?:string;}
export interface EnvironmentSave {objects:EnvironmentObjectSave[];drops:GroundDropSave[];processedEventIds:string[];defeatedBeastIds:string[];resourceNodes?:ResourceNodeSave[];fauna?:FaunaSave[];faunaRespawns?:FaunaRespawnSave[];faunaSpawnSerial?:number;faunaRespawnStats?:Record<string,FaunaRespawnZoneStats>;fish?:RiverFishSave[];mapId?:string;}
export type CommissionType='repair'|'escort'|'hunt';
export type CommissionStatus='posted'|'accepted'|'in_progress'|'paused'|'completed'|'claimed'|'failed'|'expired'|'cancelled';
export interface CommissionSave {
  commissionId:string;worldId:string;issuerId:string;type:CommissionType;title:string;description:string;targetId:string;target:{x:number;y:number};areaId:string;
  requirements:{profession?:NPCProfession;minRealmIndex?:number};reward:{currency:'spirit_stones';amount:number};rewardSourceId:string;rewardEscrow:number;
  materialsCost:Partial<Record<TradeItemId,number>>;materialsConsumed:boolean;createdDay:number;createdMinute:number;dueAt:number;
  acceptedBy:string|null;progress:number;status:CommissionStatus;sourceEventId:string;rewardTransactionId?:string;materialTransactionId?:string;lastTransitionId?:string;pauseReason?:string;
}
export interface CommissionTransaction {id:string;commissionId:string;type:'escrow'|'refund'|'materials'|'reward';day:number;minute:number;fromId:string;toId:string;amount:number;items?:MarketStock[];}
export interface EconomySave { remainderMinutes:number; transactions:TradeRecord[]; }
export type SectRank='tạp_dịch'|'ngoại_môn'|'nội_môn'|'chân_truyền'|'chấp_sự'|'trưởng_lão'|'chưởng_môn';
export interface SectSave { id:string; factionId:string; name:string; leaderId:string; elderIds:string[]; memberLimit:number; rankByNpc:Record<string,SectRank>; mentors:Array<{mentorId:string;discipleId:string;sinceDay:number;trust:number;lessons:number}>; ownedTechniques:TechniqueId[]; reputation:number; power:number; territory:string[]; recruitmentCooldownDay:number; lastStipendDay:number; lastMissionDay:number; developmentGoal:'recruit'|'cultivate'|'gather'|'defend'; }
export interface SectInvitation { id:string; sectId:string; candidateId:string; inviterId:string; createdDay:number; score:number; status:'travelling'|'accepted'|'joined'|'rejected'|'expired'; }
export interface SectMission { id:string; sectId:string; type:'collect-herbs'|'mine-ore'|'hunt-beast'|'cultivate'|'defend-vein'; title:string; resourceId?:TradeItemId; quantity:number; assigneeId:string|null; target:{x:number;y:number}; createdDay:number; dueDay:number; status:'open'|'active'|'completed'|'failed'; rewarded:boolean; }
export interface SpiritVeinSave { id:string; name:string; x:number; y:number; qi:number; maxQi:number; regenerationPerDay:number; ownerFactionId:string|null; control:number; disputed:boolean; discovererIds:string[]; }
export interface FactionConflictSave { id:string; veinId:string; aggressorFactionId:string; defenderFactionId:string|null; startDay:number; resolveDay:number; status:'scouting'|'negotiating'|'disputed'|'controlled'|'withdrawn'|'resolved'; participantIds:string[]; log:string[]; }
export type BoardKind='realm'|'talent'|'treasure'|'achievement'|'prodigy';
export interface TreasureProvenance {id:string;itemId:TradeItemId;sourceEventId:string;ownerId:string;transferEventIds:string[];}
export interface BoardNews {id:string;targetId:string;kind:BoardKind;content:string;itemId?:string;ownerAtPublishId?:string;sourceEventId?:string;provenanceId?:string;day:number;minute:number;createdAt:number;knownBy:string[];reactions:Record<string,string>;expiresDay:number;}
export interface TreasureOffer {id:string;newsId:string;buyerId:string;sellerId:string;itemId:TradeItemId;price:number;status:'pending'|'accepted'|'refused'|'failed';day:number;refusedAt?:number;nextRobberyCheck?:number;transferEventId?:string;provenanceId?:string;}
export interface TreasureDuel {id:string;offerId:string;attackerId:string;defenderId:string;itemId:TradeItemId;status:'approaching'|'fighting'|'won'|'lost'|'retreated'|'cancelled';nextAction:number;round:number;looted:boolean;guardianId?:string;sourceNewsId?:string;sourceEventId?:string;provenanceId?:string;lossEventId?:string;}
export interface DestinyChronicle {sourceId:string;causeSourceId?:string;type:string;day:number;minute:number;description:string;otherId?:string;itemId?:string;}
export interface DestinyRecord {npcId:string;worldId:string;chosenDay:number;chosenMinute:number;initialRealmIndex:number;initialRealmLevel:number;talent:number;root:string;faction:string;initialRelationships:Record<string,number>;investment:number;giftIds:string[];history:DestinyChronicle[];seenIds:string[];}
export interface CultivationMandate {id:string;npcId:string;issuedAt:number;expiresAt:number;readyAt:number;status:'issued'|'accepted'|'active'|'delayed'|'completed'|'failed'|'expired'|'refused'|'cancelled';trainedMinutes:number;kind?:'cultivate'|'travel'|'gather'|'protect'|'avoid';targetId?:string;target?:{x:number;y:number};cost?:number;progress?:number;reason?:string;resourceApplied?:boolean;protectedId?:string;zone?:{name:string;x:number;y:number;width:number;height:number};threatCount?:number;pathFailures?:number;pathRetryAt?:number;guardian?:{duelId:string;enemyId:string;state:'approaching'|'fighting'|'retreated'|'saved'|'failed';nextAttack:number;hitCount:number;};}
export interface NPCPopulationManifest { version:1; target:108; seed:string; initialized:boolean; idsByRole:Partial<Record<PopulationRole,string[]>>; }
export interface AuthorityRealmChange { npcId:string; from:{realmIndex:number;realmLevel:number}; to:{realmIndex:number;realmLevel:number}; reason:string; }
export interface AuthoritySave { version:1; realmBalanceVersion:1; cityMasterId:string; sectLeaderId:string; realmChanges:AuthorityRealmChange[]; }
export interface CityIncidentSave {id:string;combatEventId:string;attackerId:string;victimId:string;suspectId:string;protectedNpcId:string;at:number;severity:number;status:'responding'|'contained'|'cleared';responderIds:string[];cityMasterDispatched:boolean;reason:string;}
export interface DivineWorldSave { version:number; worldId:string; access:WorldAccess[]; clock:WorldClockSave; heaven:HeavenSave; npcs:SimNPC[]; events:WorldEvent[]; rewardedEventIds:string[]; sieges:BeastSiegeSave[]; lastSiegeDay:number; ascendedRecords:AscendedCultivatorRecord[]; factions:FactionSave[]; settlement:SettlementSave; shops:ShopSave[]; economy:EconomySave; sects:SectSave[]; invitations:SectInvitation[]; sectMissions:SectMission[]; spiritVeins:SpiritVeinSave[]; factionConflicts:FactionConflictSave[]; boardNews?:BoardNews[]; boardReadyAt?:number; treasureOffers?:TreasureOffer[]; treasureDuels?:TreasureDuel[]; treasureProvenance?:TreasureProvenance[]; destinies?:DestinyRecord[]; cultivationMandates?:CultivationMandate[]; environment?:EnvironmentSave; commissions?:CommissionSave[]; commissionTransactions?:CommissionTransaction[]; commissionBoard?:{x:number;y:number}; commissionClerkId?:string; population?:NPCPopulationManifest; authority?:AuthoritySave; cityLaw?:{version:1;incidents:CityIncidentSave[];handledCombatEventIds:string[];recentAssaults:{attackerId:string;victimId:string;at:number}[]}; }

