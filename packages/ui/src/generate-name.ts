// --- Built-in dictionaries ---

export const adjectives: string[] = [
  "swift", "clever", "bold", "bright", "calm", "daring", "eager", "fierce",
  "gentle", "happy", "keen", "lively", "mighty", "noble", "plucky", "quick",
  "radiant", "silent", "tough", "vivid", "ancient", "blazing", "cosmic",
  "dazzling", "electric", "frosty", "golden", "hollow", "iron", "jolly",
  "kindred", "lunar", "mystic", "nimble", "obsidian", "phantom", "quiet",
  "rustic", "savage", "tidal", "ultra", "velvet", "wicked", "xenial",
  "young", "zealous", "amber", "brazen", "crimson", "dusky", "emerald",
  "flaming", "ghostly", "hasty", "icy", "jade", "knightly", "lucid",
  "marble", "neon",
];

export const animals: string[] = [
  "panda", "fox", "owl", "wolf", "bear", "hawk", "lynx", "otter", "raven",
  "tiger", "dolphin", "falcon", "koala", "parrot", "seal", "badger", "crane",
  "heron", "jaguar", "viper", "cobra", "eagle", "ferret", "gecko", "husky",
  "ibis", "jackal", "kiwi", "lemur", "moose", "newt", "ocelot", "penguin",
  "quail", "robin", "salmon", "toucan", "urchin", "vulture", "walrus",
  "yak", "zebra", "alpaca", "bison", "chameleon", "dingo", "elk", "flamingo",
  "gazelle", "hamster", "iguana", "jellyfish", "kangaroo", "lobster",
  "mantis", "narwhal", "octopus", "porcupine", "raccoon", "starling",
];

export const colors: string[] = [
  "red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan",
  "magenta", "lime", "teal", "indigo", "violet", "coral", "scarlet",
  "azure", "crimson", "emerald", "ivory", "jade", "lavender", "maroon",
  "navy", "olive", "pearl", "ruby", "sapphire", "silver", "gold", "bronze",
];

export const names: string[] = [
  "alice", "bob", "charlie", "diana", "emma", "frank", "grace", "henry",
  "iris", "jack", "kate", "leo", "maya", "noah", "olivia", "paul", "quinn",
  "ruby", "sam", "tara", "uma", "victor", "wendy", "xander", "yara", "zane",
  "aria", "blake", "cora", "dean", "ella", "finn", "gwen", "hugo", "ivy",
  "joel", "kira", "liam", "mila", "nora", "owen", "piper", "reed", "sara",
  "theo", "vera", "wade", "xena", "yuri", "zara",
];

// --- NumberDictionary ---

export const NumberDictionary = {
  generate(opts: { min?: number; max?: number; length?: number } = {}): string[] {
    const { min = 0, max = 999, length } = opts;
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    const s = String(n);
    return [length != null ? s.padStart(length, "0") : s];
  },
};

// --- Config & core function ---

export interface GenerateNameConfig {
  dictionaries: string[][];
  separator?: string;
  length?: number;
  style?: "lowerCase" | "upperCase" | "capital";
  seed?: number | string;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toSeedNumber(seed: number | string): number {
  if (typeof seed === "number") return seed;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return h;
}

function applyStyle(word: string, style?: GenerateNameConfig["style"]): string {
  switch (style) {
    case "upperCase":
      return word.toUpperCase();
    case "capital":
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    case "lowerCase":
    default:
      return word.toLowerCase();
  }
}

export function generateName(config: GenerateNameConfig): string {
  const {
    dictionaries,
    separator = "_",
    length = dictionaries.length,
    style,
    seed,
  } = config;

  const rand = seed != null ? mulberry32(toSeedNumber(seed)) : Math.random;
  const count = Math.min(length, dictionaries.length);
  const parts: string[] = [];

  for (let i = 0; i < count; i++) {
    const dict = dictionaries[i]!;
    if (dict.length === 0) continue;
    const word = dict[Math.floor(rand() * dict.length)]!;
    parts.push(applyStyle(word, style));
  }

  return parts.join(separator);
}

// --- Legacy wrapper (preserves existing call sites) ---

export function generateFunName(): string {
  return generateName({
    dictionaries: [adjectives, animals],
    separator: "",
    style: "capital",
  });
}
