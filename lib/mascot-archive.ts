export type MascotCategory = "person" | "animal" | "food" | "abstract" | "fantasy";

export interface MascotArchiveEntry {
  id: string;
  edition: number;
  host: string;
  name: string;
  form: string;
  detail: string;
  category: MascotCategory;
  role?: string;
}

export const MASCOT_HISTORY_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/mascots-history";
export const MASCOT_2026_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/mascots";

export const WORLD_CUP_MASCOTS: MascotArchiveEntry[] = [
  { id: "willie-1966", edition: 1966, host: "England", name: "World Cup Willie", form: "Lion", category: "animal", detail: "The first FIFA World Cup mascot: a lion wearing a Union Jack shirt." },
  { id: "juanito-1970", edition: 1970, host: "Mexico", name: "Juanito", form: "Boy in a sombrero", category: "person", detail: "A young supporter in Mexico's colours and a sombrero marked MEXICO 70." },
  { id: "tip-tap-1974", edition: 1974, host: "West Germany", name: "Tip and Tap", form: "Two boys", category: "person", detail: "Two football-loving boys wearing shirts marked WM 74 and the number 74." },
  { id: "gauchito-1978", edition: 1978, host: "Argentina", name: "Gauchito", form: "Young gaucho", category: "person", detail: "A young Argentine supporter with a hat, neckerchief and riding crop." },
  { id: "naranjito-1982", edition: 1982, host: "Spain", name: "Naranjito", form: "Orange", category: "food", detail: "A smiling orange, representing a fruit strongly associated with Spain." },
  { id: "pique-1986", edition: 1986, host: "Mexico", name: "Pique", form: "Giant chilli pepper", category: "food", detail: "A moustachioed chilli pepper in a sombrero; FIFA describes him as a giant chilli pepper." },
  { id: "ciao-1990", edition: 1990, host: "Italy", name: "Ciao", form: "Tricolour stick figure", category: "abstract", detail: "A geometric footballer assembled from blocks in Italy's tricolour, with a ball for a head." },
  { id: "striker-1994", edition: 1994, host: "United States", name: "Striker", form: "Dog", category: "animal", detail: "A football-playing dog wearing the red, white and blue of the host nation." },
  { id: "footix-1998", edition: 1998, host: "France", name: "Footix", form: "Gallic rooster", category: "animal", detail: "A blue Gallic rooster with a red crest, named by combining football with the -ix suffix." },
  { id: "spheriks-2002", edition: 2002, host: "Korea/Japan", name: "Ato, Kaz and Nik", form: "Atomball trio", category: "fantasy", detail: "The Spheriks trio from the fictional Atmozone: Ato is the coach, while Kaz and Nik are players." },
  { id: "goleo-pille-2006", edition: 2006, host: "Germany", name: "Goleo VI and Pille", form: "Lion and talking ball", category: "fantasy", detail: "Goleo VI is a football-loving lion; Pille is his talkative football companion." },
  { id: "zakumi-2010", edition: 2010, host: "South Africa", name: "Zakumi", form: "Leopard", category: "animal", detail: "A green-haired leopard whose name combines ZA, South Africa's country code, and kumi, meaning ten in several African languages." },
  { id: "fuleco-2014", edition: 2014, host: "Brazil", name: "Fuleco", form: "Three-banded armadillo", category: "animal", detail: "A Brazilian three-banded armadillo; the name combines the Portuguese words for football and ecology." },
  { id: "zabivaka-2018", edition: 2018, host: "Russia", name: "Zabivaka", form: "Wolf", category: "animal", detail: "A goggle-wearing wolf whose Russian name means the one who scores." },
  { id: "laeeb-2022", edition: 2022, host: "Qatar", name: "La'eeb", form: "Character from the mascot-verse", category: "fantasy", detail: "La'eeb means super-skilled player in Arabic and comes from an indescribable parallel mascot-verse." },
  { id: "maple-2026", edition: 2026, host: "Canada", name: "Maple", form: "Moose", category: "animal", role: "Goalkeeper", detail: "A creative, resilient goalkeeper who loves street art, music and connecting with people." },
  { id: "zayu-2026", edition: 2026, host: "Mexico", name: "Zayu", form: "Jaguar", category: "animal", role: "Striker", detail: "A striker from the jungles of southern Mexico who embodies unity, strength and joy." },
  { id: "clutch-2026", edition: 2026, host: "United States", name: "Clutch", form: "Bald eagle", category: "animal", role: "Midfielder", detail: "An adventurous midfielder who leads by action and brings people together on and off the pitch." },
];
