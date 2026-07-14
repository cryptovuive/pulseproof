export interface MascotArchiveEntry {
  edition: number;
  host: string;
  name: string;
  form: string;
  marker: string;
}

export const MASCOT_HISTORY_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/mascots-history";
export const MASCOT_2026_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/clutch-maple-zayu-mascots-unveiled";

export const WORLD_CUP_MASCOTS: MascotArchiveEntry[] = [
  { edition: 1966, host: "England", name: "World Cup Willie", form: "Lion", marker: "🦁" },
  { edition: 1970, host: "Mexico", name: "Juanito", form: "Boy in a sombrero", marker: "◉" },
  { edition: 1974, host: "West Germany", name: "Tip and Tap", form: "Two boys", marker: "◉◉" },
  { edition: 1978, host: "Argentina", name: "Gauchito", form: "Young gaucho", marker: "◉" },
  { edition: 1982, host: "Spain", name: "Naranjito", form: "Orange", marker: "🍊" },
  { edition: 1986, host: "Mexico", name: "Pique", form: "Jalapeño pepper", marker: "🌶️" },
  { edition: 1990, host: "Italy", name: "Ciao", form: "Tricolour stick figure", marker: "◇" },
  { edition: 1994, host: "United States", name: "Striker", form: "Dog", marker: "🐕" },
  { edition: 1998, host: "France", name: "Footix", form: "Gallic rooster", marker: "🐓" },
  { edition: 2002, host: "Korea/Japan", name: "Ato, Kaz and Nik", form: "Atomball trio", marker: "✦✦✦" },
  { edition: 2006, host: "Germany", name: "Goleo VI and Pille", form: "Lion and talking ball", marker: "🦁⚽" },
  { edition: 2010, host: "South Africa", name: "Zakumi", form: "Leopard", marker: "🐆" },
  { edition: 2014, host: "Brazil", name: "Fuleco", form: "Three-banded armadillo", marker: "◒" },
  { edition: 2018, host: "Russia", name: "Zabivaka", form: "Wolf", marker: "🐺" },
  { edition: 2022, host: "Qatar", name: "La'eeb", form: "Mascot-verse character", marker: "✦" },
  { edition: 2026, host: "Canada · Mexico · USA", name: "Maple · Zayu · Clutch", form: "Moose · Jaguar · Bald eagle", marker: "🫎🐆🦅" },
];
