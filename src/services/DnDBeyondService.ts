import type {
  AbilityKey,
  Character,
  CharacterClass,
  EquipmentItem,
  Feature,
  Resource,
  Spell,
} from '../types/character.js';
import type { DndBeyondCharacterResponse } from '../types/character.js';

const DEFAULT_AVATAR =
  'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';
const ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ALIGNMENTS: Record<number, string> = {
  1: 'Lawful Good',
  2: 'Neutral Good',
  3: 'Chaotic Good',
  4: 'Lawful Neutral',
  5: 'True Neutral',
  6: 'Chaotic Neutral',
  7: 'Lawful Evil',
  8: 'Neutral Evil',
  9: 'Chaotic Evil',
};
const SKILL_NAMES: Record<string, string> = {
  acrobatics: 'Acrobatics',
  'animal-handling': 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  'sleight-of-hand': 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};
const ABILITY_NAMES: Record<string, AbilityKey> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};
const ABILITY_BY_ID: Record<number, AbilityKey> = {
  1: 'str',
  2: 'dex',
  3: 'con',
  4: 'int',
  5: 'wis',
  6: 'cha',
};

type Dict = Record<string, unknown>;
const dict = (value: unknown): Dict =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : {};
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);
const number = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const title = (value: string): string =>
  value
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').trim();
const splitText = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\r?\n|\\n/) : [])
    .map((item) => text(item).trim())
    .filter(Boolean);

interface Modifier {
  type: string;
  subType: string;
}

/** D&D Beyond groups modifiers by source: race, class, background, feat and item. */
export function flattenModifiers(value: unknown): Modifier[] {
  return Object.values(dict(value)).flatMap((source) =>
    array(source)
      .map((item) => {
        const modifier = dict(item);
        return {
          type: text(modifier.type).toLowerCase(),
          subType: text(modifier.subType).toLowerCase(),
        };
      })
      .filter((modifier) => modifier.type && modifier.subType),
  );
}

const resetName = (resetType: number): string | undefined =>
  resetType === 1
    ? 'short rest'
    : resetType === 2
      ? 'long rest'
      : resetType >= 0
        ? `reset-${resetType}`
        : undefined;

const toResource = (value: unknown): Resource | undefined => {
  const item = dict(value);
  const limit = dict(item.limitedUse);
  if (Object.keys(limit).length === 0) return undefined;
  const max = Math.max(0, number(limit.maxUses ?? limit.maxUse));
  const used = Math.max(0, number(limit.numberUsed ?? limit.used));
  return {
    name: text(item.name ?? dict(item.definition).name, 'Resource'),
    current: Math.max(0, max - used),
    max,
    resetOn: resetName(number(limit.resetType, -1)),
  };
};

function getSpellcastingAbility(classesData: Dict[]): AbilityKey {
  const casterClass = classesData.find((c) => bool(dict(c).isStartingClass)) ?? classesData[0];
  const abilityId = number(dict(dict(casterClass).definition).spellCastingAbilityId, 0);
  return ABILITY_BY_ID[abilityId] ?? 'int';
}

export class DnDBeyondService {
  constructor(private readonly baseUrl = 'https://character-service.dndbeyond.com') {}

  async fetchCharacter(characterId: string): Promise<Character> {
    const response = await fetch(`${this.baseUrl}/character/v5/character/${characterId}`);
    if (!response.ok) throw new Error(`D&D Beyond request failed (${response.status})`);
    const payload = (await response.json()) as DndBeyondCharacterResponse;
    if (!payload.success || !payload.data) throw new Error('Invalid D&D Beyond character response');
    return this.normalize(payload.data);
  }

  private normalize(data: Dict): Character {
    const modifiers = flattenModifiers(data.modifiers);
    const stats = array(data.stats).map(dict);
    const readStat = (id: number): number =>
      number(stats.find((stat) => number(stat.id) === id)?.value, 10);
    const values = {
      str: readStat(1),
      dex: readStat(2),
      con: readStat(3),
      int: readStat(4),
      wis: readStat(5),
      cha: readStat(6),
    };
    const abilityModifiers = Object.fromEntries(
      ABILITIES.map((key) => [key, Math.floor((values[key] - 10) / 2)]),
    ) as unknown as Character['modifiers'];
    const classesData = array(data.classes).map(dict);
    const classes = classesData.map((item): CharacterClass => ({
      name: text(dict(item.definition).name, 'Unknown'),
      level: number(item.level),
    }));
    const level = classes.reduce((total, item) => total + item.level, 0);
    const proficiencyBonus = level > 0 ? Math.ceil(level / 4) + 1 : 2;
    const saves = modifiers
      .filter((item) => item.type === 'proficiency' && item.subType.endsWith('-saving-throws'))
      .map(
        (item) =>
          ABILITY_NAMES[item.subType.replace(/-saving-throws$/, '')] ?? item.subType.split('-')[0],
      )
      .filter((key): key is AbilityKey => ABILITIES.includes(key as AbilityKey));
    const skills = modifiers
      .filter((item) => item.type === 'proficiency' && item.subType in SKILL_NAMES)
      .map((item) => SKILL_NAMES[item.subType] ?? title(item.subType));
    const proficiencies = modifiers.filter((item) => item.type === 'proficiency');
    const proficiencyDetails = {
      armor: proficiencies
        .filter((item) => item.subType.includes('armor'))
        .map((item) => title(item.subType)),
      weapons: proficiencies
        .filter((item) => item.subType.includes('weapon'))
        .map((item) => title(item.subType)),
      tools: proficiencies
        .filter((item) => item.subType.includes('tool'))
        .map((item) => title(item.subType)),
      languages: modifiers
        .filter((item) => item.type === 'language')
        .map((item) => title(item.subType)),
    };
    const equipment = array(data.inventory).map((item) =>
      this.normalizeEquipment(
        dict(item),
        abilityModifiers,
        proficiencyBonus,
        proficiencyDetails.weapons,
      ),
    );
    const resources = array(dict(data.actions).class)
      .concat(classesData.flatMap((item) => array(item.classFeatures)))
      .map(toResource)
      .filter((item): item is Resource => item !== undefined);
    const race = dict(data.race);
    const background = dict(data.background);
    const backgroundDefinition = dict(background.definition);
    const maxHp = number(data.overrideHitPoints ?? data.baseHitPoints);
    const hitDiceMax = classesData.reduce((total, item) => total + number(item.level), 0);
    const firstDefinition = dict(classesData[0]?.definition);
    const hitDiceDefinition = firstDefinition.hitDice;
    const dieType = number(dict(hitDiceDefinition).diceValue ?? hitDiceDefinition);
    const usedHitDice = classesData.reduce((total, item) => total + number(item.hitDiceUsed), 0);
    const speed = dict(dict(race.weightSpeeds).normal).walk;
    const acValue = data.overrideArmorClass ?? data.armorClass;

    // Spell Slots normalization (data.spellSlots contains used slots per level)
    const rawSpellSlots = array(data.spellSlots).map(dict); // array of { level, used }
    const pactMagic = array(data.pactMagic).map(dict);

    // Determine caster level for multiclass calculation (exclude Warlock/pact)
    const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
    const halfCasters = ['paladin', 'ranger'];
    let casterLevel = 0;
    for (const cls of classesData) {
      const def = dict(cls.definition);
      const name = text(def.name).toLowerCase();
      const lvl = number(cls.level);
      if (fullCasters.includes(name)) casterLevel += lvl;
      else if (halfCasters.includes(name)) casterLevel += Math.floor(lvl / 2);
    }

    // Multiclass spell slot table (index = caster level 0..20)
    const multiSlots: number[][] = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 0, 0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 2, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 1, 0, 0, 0, 0, 0],
      [4, 3, 3, 2, 0, 0, 0, 0, 0],
      [4, 3, 3, 3, 1, 0, 0, 0, 0],
      [4, 3, 3, 3, 2, 0, 0, 0, 0],
      [4, 3, 3, 3, 2, 1, 0, 0, 0],
      [4, 3, 3, 3, 2, 1, 0, 0, 0],
      [4, 3, 3, 3, 2, 1, 1, 0, 0],
      [4, 3, 3, 3, 2, 1, 1, 0, 0],
      [4, 3, 3, 3, 2, 1, 1, 1, 0],
      [4, 3, 3, 3, 2, 1, 1, 1, 0],
      [4, 3, 3, 3, 2, 1, 1, 1, 1],
      [4, 3, 3, 3, 3, 1, 1, 1, 1],
      [4, 3, 3, 3, 3, 2, 1, 1, 1],
      [4, 3, 3, 3, 3, 2, 2, 1, 1],
    ];

    const cappedCasterLevel = Math.max(0, Math.min(20, casterLevel));
    const spellSlots: Record<string, { current: number; max: number }> = {};
    for (let lvl = 1; lvl <= 9; lvl++) {
      const max = multiSlots[cappedCasterLevel]?.[lvl - 1] ?? 0;
      const usedEntry = rawSpellSlots.find((s) => number(s.level) === lvl);
      const used = number(usedEntry?.used ?? 0);
      const current = Math.max(0, max - used);
      if (max > 0 || used > 0) spellSlots[String(lvl)] = { current, max };
    }

    // Include pact magic as separate entries if present (warlock)
    if (pactMagic.length > 0) {
      pactMagic.forEach((p) => {
        const lvl = number(p.level);
        const key = `pact-${lvl}`;
        // D&D Beyond does not provide a direct max for pact slots here; store used/max=0 so UI can show used if present
        spellSlots[key] = { current: 0, max: 0 };
      });
    }

    return {
      id: text(data.id),
      name: text(data.name, 'Unnamed Character'),
      avatarUrl: text(data.avatarUrl ?? dict(data.decorations).avatarUrl, DEFAULT_AVATAR),
      race: text(race.fullName, 'Unknown Race'),
      classes,
      level,
      hp: {
        current: Math.max(0, maxHp - number(data.removedHitPoints)),
        max: maxHp,
        temp: number(data.temporaryHitPoints),
      },
      stats: values,
      modifiers: abilityModifiers,
      ac: acValue == null ? null : number(acValue),
      currencies: {
        cp: number(dict(data.currencies).cp),
        sp: number(dict(data.currencies).sp),
        ep: number(dict(data.currencies).ep),
        gp: number(dict(data.currencies).gp),
        pp: number(dict(data.currencies).pp),
      },
      inspiration: bool(data.inspiration),
      speed: number(speed, 30),
      alignment: ALIGNMENTS[number(data.alignmentId)] ?? text(data.alignment),
      xp: number(data.currentXp),
      damageImmunities: modifiers
        .filter((item) => item.type === 'immunity')
        .map((item) => title(item.subType)),
      damageResistances: modifiers
        .filter((item) => item.type === 'resistance')
        .map((item) => title(item.subType)),
      damageVulnerabilities: modifiers
        .filter((item) => item.type === 'vulnerability')
        .map((item) => title(item.subType)),
      conditions: [],
      proficiencies: { saves: [...new Set(saves)], skills: [...new Set(skills)] },
      proficiencyDetails,
      resources,
      hitDice: { current: Math.max(0, hitDiceMax - usedHitDice), max: hitDiceMax, dieType },
      equipment,
      spells: this.normalizeSpells(
        data,
        abilityModifiers,
        proficiencyBonus,
        getSpellcastingAbility(classesData),
      ),
      features: this.normalizeFeatures(data, classesData, resources),
      traits: this.normalizeFeatures(data, classesData, resources),
      background: {
        name: text(backgroundDefinition.name, text(background.name)),
        description: text(
          backgroundDefinition.shortDescription ?? backgroundDefinition.description,
          text(background.description),
        ),
      },
      personalityTraits: splitText(dict(data.traits).personalityTraits),
      ideals: splitText(dict(data.traits).ideals),
      bonds: splitText(dict(data.traits).bonds),
      flaws: splitText(dict(data.traits).flaws),
      spellSlots,
    };
  }

  private normalizeEquipment(
    raw: Dict,
    modifiers: Character['modifiers'],
    proficiencyBonus: number,
    weapons: string[],
  ): EquipmentItem {
    const definition = dict(raw.definition);
    const kind = text(definition.filterType ?? definition.type);
    const isWeapon = /weapon/i.test(kind) || definition.attackType != null;
    const properties = array(definition.properties)
      .map((value) => text(value))
      .join(' ')
      .toLowerCase();
    const ability = properties.includes('finesse')
      ? Math.max(modifiers.str, modifiers.dex)
      : /ranged/i.test(kind)
        ? modifiers.dex
        : modifiers.str;
    const proficient = weapons.some(
      (weapon) =>
        kind.toLowerCase().includes(weapon.toLowerCase()) ||
        weapon.toLowerCase().includes(kind.toLowerCase()),
    );
    const damage = dict(definition.damage);
    const dice = text(damage.diceString);
    const damageBonus = number(definition.damageBonus, ability);
    const range = number(definition.range);
    const longRange = number(definition.longRange);
    return {
      id: typeof raw.id === 'string' || typeof raw.id === 'number' ? raw.id : undefined,
      name: text(definition.name ?? raw.name, 'Unknown Item'),
      quantity: number(raw.quantity, 1),
      weight: number(definition.weight),
      equipped: bool(raw.equipped),
      attuned: bool(raw.isAttuned ?? raw.attuned),
      category: /armor|weapon|equipment/i.test(kind) ? 'Equipment' : 'Backpack',
      type: kind,
      isWeapon,
      attackBonus: isWeapon ? ability + (proficient ? proficiencyBonus : 0) : undefined,
      damage: isWeapon && dice ? `${dice}${damageBonus >= 0 ? '+' : ''}${damageBonus}` : undefined,
      range: isWeapon ? (range ? `${range}/${longRange} ft.` : '5 ft.') : undefined,
      description: text(definition.description),
    };
  }

  private normalizeSpells(
    data: Dict,
    modifiers: Character['modifiers'],
    proficiencyBonus: number,
    spellcastingAbility: AbilityKey,
  ): Spell[] {
    const spellData = dict(data.spells);
    const sources = array(data.classSpells)
      .flatMap((item) => array(dict(item).spells))
      .concat(array(spellData.class), array(spellData.race));
    return sources.map((raw) => {
      const item = dict(raw);
      const definition = dict(item.definition ?? item);
      const ability = modifiers[spellcastingAbility];
      // Components: 1=Verbal,2=Somatic,3=Material
      const compArr = array(definition.components).map(number).filter(Boolean);
      const compStr = compArr
        .map((c) => (c === 1 ? 'V' : c === 2 ? 'S' : c === 3 ? 'M' : ''))
        .filter(Boolean)
        .join(', ');
      // Range
      const rangeObj = dict(definition.range ?? dict(definition).range);
      let rangeStr = '';
      if (rangeObj.origin === 'touch') rangeStr = 'Touch';
      else if (rangeObj.origin === 'self') rangeStr = 'Self';
      else if (number(rangeObj.rangeValue)) rangeStr = `${number(rangeObj.rangeValue)} ft.`;
      // Duration
      const durationObj = dict(definition.duration ?? dict(definition).duration);
      let durationStr = '';
      if (durationObj.durationType) {
        durationStr =
          `${text(durationObj.durationInterval || '')} ${text(durationObj.durationUnit || '')}`.trim();
      } else if (definition.duration) {
        durationStr = text(definition.duration);
      }
      // Casting time / activation
      const activation = dict(
        definition.activation ??
          dict(definition).activation ??
          dict(dict(definition).spellData).activation,
      );
      const casting = text(
        definition.castingTimeDescription ||
          activation.activationTime ||
          definition.castingTime ||
          '',
      );

      return {
        name: text(definition.name, 'Unknown Spell'),
        level: number(definition.level),
        prepared: bool(item.prepared ?? item.alwaysPrepared),
        attackBonus: ability + proficiencyBonus,
        saveDC: 8 + ability + proficiencyBonus,
        damage: text(definition.damage) || undefined,
        castingTime: casting || undefined,
        range: rangeStr || undefined,
        components: compStr || undefined,
        duration: durationStr || undefined,
        source: text(definition.source) || undefined,
      };
    });
  }

  private normalizeFeatures(data: Dict, classes: Dict[], resources: Resource[]): Feature[] {
    const classEntries = classes.flatMap((item) =>
      array(item.classFeatures ?? dict(item.definition).classFeatures).map((raw) => ({
        raw,
        source: text(dict(item.definition).name),
        category: 'Class Features',
      })),
    );
    const race = dict(data.race);
    const entries = classEntries
      .concat(
        array(race.racialTraits).map((raw) => ({
          raw,
          source: text(race.fullName),
          category: 'Species Traits',
        })),
      )
      .concat(array(data.feats).map((raw) => ({ raw, source: 'Feat', category: 'Feats' })));
    return entries.map(({ raw, source, category }) => {
      const item = dict(raw);
      const definition = dict(item.definition ?? item);
      const name = text(definition.name, 'Unknown Feature');
      const matchedResource = resources.find((r) => r.name === name);
      return {
        name,
        description: stripHtml(text(definition.description)),
        category,
        source,
        usesResourceName: matchedResource?.name,
      };
    });
  }
}
