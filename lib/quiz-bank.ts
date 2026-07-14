import type { QuizQuestionPublic, QuizRound } from "@/types/pulse";

interface QuizQuestion extends QuizQuestionPublic {
  correctIndex: number;
  explanation: string;
}

const TITLES_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/teams-most-wins-titles-trophies";
const SCORERS_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/fifa-world-cup-all-time-leading-scorers";
const GOLDEN_BOOT_SOURCE = "https://www.fifa.com/en/articles/top-goalscorers-leading-marksmen-golden-boot-fifa-world-cup-qatar-2022";
const FORMAT_SOURCE = "https://inside.fifa.com/tournaments/mens/worldcup/canadamexicousa2026/media-releases/fifa-world-cup-2026-tm-host-city-operational-planning-tour-kicks-off-in-miami";
const GROUP_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-group-stages-though-the-years";
const CARDS_2026_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/yellow-cards-reset-group-stage-quarter-final";
const ZIDANE_SOURCE = "https://www.fifa.com/en/articles/zinedine-zidane-marco-materazzi-final-headbutt-2006";
const RED_RECORD_SOURCE = "https://inside.fifa.com/tournaments/mens/worldcup/2018russia/news/28-days-to-go-marching-orders";
const PHOTO_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/celebration-commiseration-final-whistle-photos";
const FRANCE_1998_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/france-1998-winners-champions-stats-statistics";
const FINALS_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-finals-that-made-history";
const PELE_SOURCE = "https://www.fifa.com/en/articles/pele-three-world-cup-titles-only-player";
const SUBSTITUTIONS_SOURCE = "https://www.fifa.com/en/tournaments/mens/worldcup/articles/substitutions-substitutes-rule-changes-history";
const QATAR_SOURCE = "https://inside.fifa.com/en/tournaments/mens/worldcup/qatar2022/news/triumphant-argentina-conclude-unprecedented-fifa-world-cup";

export const QUIZ_BANK: QuizQuestion[] = [
  { id: "titles-brazil", era: "history", difficulty: "rookie", prompt: "How many men's World Cup titles had Brazil won before the 2026 tournament?", options: ["4", "5", "6", "7"], correctIndex: 1, explanation: "Brazil won in 1958, 1962, 1970, 1994 and 2002: five titles.", sourceLabel: "FIFA · Teams with most titles", sourceUrl: TITLES_SOURCE },
  { id: "titles-germany", era: "history", difficulty: "rookie", prompt: "How many men's World Cup titles had Germany won before 2026?", options: ["3", "4", "5", "6"], correctIndex: 1, explanation: "Germany's four titles came in 1954, 1974, 1990 and 2014.", sourceLabel: "FIFA · Teams with most titles", sourceUrl: TITLES_SOURCE },
  { id: "titles-italy", era: "history", difficulty: "rookie", prompt: "Italy entered the 2026 tournament with how many World Cup titles?", options: ["2", "3", "4", "5"], correctIndex: 2, explanation: "Italy won in 1934, 1938, 1982 and 2006.", sourceLabel: "FIFA · Teams with most titles", sourceUrl: TITLES_SOURCE },
  { id: "titles-argentina", era: "history", difficulty: "rookie", prompt: "How many titles did Argentina hold after winning Qatar 2022?", options: ["2", "3", "4", "5"], correctIndex: 1, explanation: "Argentina won the World Cup in 1978, 1986 and 2022.", sourceLabel: "FIFA · Teams with most titles", sourceUrl: TITLES_SOURCE },
  { id: "titles-france", era: "history", difficulty: "rookie", prompt: "France's first two men's World Cup titles came in which years?", options: ["1986 and 1990", "1994 and 1998", "1998 and 2018", "2006 and 2022"], correctIndex: 2, explanation: "France lifted the trophy on home soil in 1998 and again in Russia in 2018.", sourceLabel: "FIFA · Teams with most titles", sourceUrl: TITLES_SOURCE },
  { id: "pele-titles", era: "records", difficulty: "pro", prompt: "How many World Cups did Pelé win as a player?", options: ["2", "3", "4", "5"], correctIndex: 1, explanation: "Pelé remains the only player to win three: 1958, 1962 and 1970.", sourceLabel: "FIFA · Pelé's unique treble", sourceUrl: PELE_SOURCE },
  { id: "pele-years", era: "history", difficulty: "legend", prompt: "Which set contains all three World Cup editions won by Pelé?", options: ["1954, 1958, 1962", "1958, 1962, 1966", "1958, 1962, 1970", "1962, 1966, 1970"], correctIndex: 2, explanation: "His winner's medals came in Sweden 1958, Chile 1962 and Mexico 1970.", sourceLabel: "FIFA · Pelé's unique treble", sourceUrl: PELE_SOURCE },
  { id: "klose-total", era: "records", difficulty: "pro", prompt: "How many World Cup goals did Miroslav Klose score across his career?", options: ["14", "15", "16", "17"], correctIndex: 2, explanation: "Klose scored 16 goals in 24 matches across four editions.", sourceLabel: "FIFA · All-time leading scorers", sourceUrl: SCORERS_SOURCE },
  { id: "ronaldo-total", era: "records", difficulty: "pro", prompt: "Brazilian striker Ronaldo finished his World Cup career with how many goals?", options: ["13", "14", "15", "16"], correctIndex: 2, explanation: "Ronaldo scored 15 World Cup goals, including eight in 2002.", sourceLabel: "FIFA · All-time leading scorers", sourceUrl: SCORERS_SOURCE },
  { id: "fontaine-record", era: "records", difficulty: "pro", prompt: "Just Fontaine's single-tournament scoring record from 1958 is how many goals?", options: ["10", "11", "12", "13"], correctIndex: 3, explanation: "Fontaine scored 13 times in six matches at Sweden 1958.", sourceLabel: "FIFA · All-time leading scorers", sourceUrl: SCORERS_SOURCE },
  { id: "pele-goals", era: "records", difficulty: "pro", prompt: "How many goals did Pelé score across his World Cup career?", options: ["10", "11", "12", "13"], correctIndex: 2, explanation: "Pelé scored 12 times across four World Cups.", sourceLabel: "FIFA · All-time leading scorers", sourceUrl: SCORERS_SOURCE },
  { id: "qatar-golden-boot", era: "history", difficulty: "rookie", prompt: "Who won the Golden Boot at Qatar 2022?", options: ["Lionel Messi", "Kylian Mbappé", "Olivier Giroud", "Julián Álvarez"], correctIndex: 1, explanation: "Mbappé finished as top scorer with eight goals.", sourceLabel: "FIFA · Qatar 2022 top scorers", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "qatar-mbappe-goals", era: "records", difficulty: "rookie", prompt: "How many goals did Kylian Mbappé score at Qatar 2022?", options: ["6", "7", "8", "9"], correctIndex: 2, explanation: "Mbappé scored eight, one more than Lionel Messi.", sourceLabel: "FIFA · Qatar 2022 top scorers", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "qatar-messi-goals", era: "records", difficulty: "pro", prompt: "How many goals did Lionel Messi score during Qatar 2022?", options: ["5", "6", "7", "8"], correctIndex: 2, explanation: "Messi scored seven and finished second in the Golden Boot ranking.", sourceLabel: "FIFA · Qatar 2022 top scorers", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "qatar-total-goals", era: "records", difficulty: "legend", prompt: "How many total goals were scored at Qatar 2022?", options: ["168", "170", "171", "172"], correctIndex: 3, explanation: "The tournament produced a then-record 172 goals.", sourceLabel: "Inside FIFA · Qatar 2022 facts", sourceUrl: QATAR_SOURCE },
  { id: "golden-boot-1958", era: "history", difficulty: "pro", prompt: "Who was the leading scorer at the 1958 World Cup?", options: ["Pelé", "Just Fontaine", "Garrincha", "Vavá"], correctIndex: 1, explanation: "France's Just Fontaine scored a record 13 goals.", sourceLabel: "FIFA · Golden Boot winners", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "golden-boot-2002", era: "history", difficulty: "rookie", prompt: "Who scored eight goals to win the 2002 Golden Boot?", options: ["Rivaldo", "Miroslav Klose", "Ronaldo", "Ronaldinho"], correctIndex: 2, explanation: "Ronaldo scored eight as Brazil won its fifth title.", sourceLabel: "FIFA · Golden Boot winners", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "golden-boot-2014", era: "history", difficulty: "pro", prompt: "Who won the Golden Boot at Brazil 2014?", options: ["Thomas Müller", "Lionel Messi", "James Rodríguez", "Neymar"], correctIndex: 2, explanation: "James Rodríguez led the tournament with six goals.", sourceLabel: "FIFA · Golden Boot winners", sourceUrl: GOLDEN_BOOT_SOURCE },
  { id: "golden-boot-2018", era: "history", difficulty: "rookie", prompt: "Who was the top scorer at Russia 2018?", options: ["Kylian Mbappé", "Harry Kane", "Antoine Griezmann", "Romelu Lukaku"], correctIndex: 1, explanation: "Harry Kane won the Golden Boot with six goals.", sourceLabel: "FIFA · Golden Boot winners", sourceUrl: GOLDEN_BOOT_SOURCE },

  { id: "2026-teams", era: "2026", difficulty: "rookie", prompt: "How many teams compete at the expanded 2026 World Cup?", options: ["32", "40", "48", "64"], correctIndex: 2, explanation: "2026 is the first 48-team men's World Cup.", sourceLabel: "Inside FIFA · 2026 format", sourceUrl: FORMAT_SOURCE },
  { id: "2026-matches", era: "2026", difficulty: "rookie", prompt: "How many matches are scheduled in the 2026 tournament?", options: ["80", "96", "104", "112"], correctIndex: 2, explanation: "The expanded competition contains 104 matches.", sourceLabel: "Inside FIFA · 2026 format", sourceUrl: FORMAT_SOURCE },
  { id: "2026-hosts", era: "2026", difficulty: "rookie", prompt: "Which countries jointly host the 2026 World Cup?", options: ["Canada, Mexico and USA", "Mexico, Brazil and USA", "Canada, Costa Rica and USA", "Canada, Mexico and Argentina"], correctIndex: 0, explanation: "Canada, Mexico and the United States share hosting duties.", sourceLabel: "Inside FIFA · 2026 host cities", sourceUrl: FORMAT_SOURCE },
  { id: "2026-host-count", era: "2026", difficulty: "rookie", prompt: "Is 2026 the first men's World Cup hosted across three countries?", options: ["Yes", "No"], correctIndex: 0, explanation: "FIFA describes 2026 as the first edition with three host countries.", sourceLabel: "Inside FIFA · 2026 host cities", sourceUrl: FORMAT_SOURCE },
  { id: "2026-cities", era: "2026", difficulty: "pro", prompt: "How many host cities stage matches at the 2026 World Cup?", options: ["12", "14", "16", "18"], correctIndex: 2, explanation: "Sixteen host cities stage the 104 matches.", sourceLabel: "Inside FIFA · 2026 host cities", sourceUrl: FORMAT_SOURCE },
  { id: "2026-groups", era: "2026", difficulty: "pro", prompt: "How many groups are used in the 2026 opening round?", options: ["8", "10", "12", "16"], correctIndex: 2, explanation: "The 48 teams are divided into 12 groups of four.", sourceLabel: "FIFA · Group-stage history", sourceUrl: GROUP_SOURCE },
  { id: "2026-third-place", era: "2026", difficulty: "legend", prompt: "Besides each group's top two, how many best third-placed teams reach the 2026 Round of 32?", options: ["4", "6", "8", "12"], correctIndex: 2, explanation: "Eight best third-placed sides join the 24 top-two finishers.", sourceLabel: "FIFA · Group-stage history", sourceUrl: GROUP_SOURCE },
  { id: "2026-new-round", era: "2026", difficulty: "pro", prompt: "Which knockout round appears for the first time at the 2026 men's World Cup?", options: ["Round of 64", "Round of 32", "Round of 16", "Quarter-final"], correctIndex: 1, explanation: "The expanded field introduces an inaugural Round of 32.", sourceLabel: "FIFA · Group-stage history", sourceUrl: GROUP_SOURCE },
  { id: "2026-yellow-reset", era: "discipline", difficulty: "pro", prompt: "At which two points are single yellow cards cancelled during the 2026 tournament?", options: ["After groups and quarter-finals", "After Round of 32 and semi-finals", "After groups and semi-finals", "Only after quarter-finals"], correctIndex: 0, explanation: "Single cautions reset after the group stage and again after the quarter-finals.", sourceLabel: "FIFA · 2026 cards and suspensions", sourceUrl: CARDS_2026_SOURCE },
  { id: "2026-yellow-change", era: "discipline", difficulty: "legend", prompt: "Before 2026, were single yellow cards normally cancelled twice during a men's World Cup?", options: ["Yes", "No"], correctIndex: 1, explanation: "Previously they were cancelled once, after the quarter-finals; the extra reset reflects the expanded format.", sourceLabel: "FIFA · 2026 cards and suspensions", sourceUrl: CARDS_2026_SOURCE },

  { id: "zidane-red", era: "discipline", difficulty: "rookie", prompt: "Who was sent off for headbutting Marco Materazzi in the 2006 final?", options: ["Thierry Henry", "Zinedine Zidane", "Patrick Vieira", "Franck Ribéry"], correctIndex: 1, explanation: "Zidane received a red card late in extra time of his final career match.", sourceLabel: "FIFA · Zidane's final chapter", sourceUrl: ZIDANE_SOURCE },
  { id: "zidane-minute", era: "discipline", difficulty: "legend", prompt: "In which minute did Zidane's headbutt occur in the 2006 final?", options: ["90th", "98th", "110th", "118th"], correctIndex: 2, explanation: "FIFA records the incident in the 110th minute.", sourceLabel: "FIFA · World Cup final images", sourceUrl: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-finals-best-images-photographs" },
  { id: "red-card-record-edition", era: "discipline", difficulty: "pro", prompt: "Which World Cup edition produced a record 28 red cards?", options: ["France 1998", "Korea/Japan 2002", "Germany 2006", "South Africa 2010"], correctIndex: 2, explanation: "Germany 2006 had 28 red cards, more than any previous edition.", sourceLabel: "Inside FIFA · Marching orders", sourceUrl: RED_RECORD_SOURCE },
  { id: "nuremberg-reds", era: "discipline", difficulty: "legend", prompt: "How many red cards were shown in the 2006 Portugal–Netherlands 'Battle of Nuremberg'?", options: ["2", "3", "4", "5"], correctIndex: 2, explanation: "The match produced four reds and 16 yellows, both World Cup match records.", sourceLabel: "FIFA · Agony and ecstasy", sourceUrl: PHOTO_SOURCE },
  { id: "nuremberg-yellows", era: "discipline", difficulty: "legend", prompt: "How many yellow cards accompanied the four reds in Portugal–Netherlands in 2006?", options: ["12", "14", "16", "18"], correctIndex: 2, explanation: "Referee Valentin Ivanov showed 16 yellow cards.", sourceLabel: "FIFA · Agony and ecstasy", sourceUrl: PHOTO_SOURCE },
  { id: "france-1998-sendoffs", era: "discipline", difficulty: "legend", prompt: "How many France players were sent off during their title-winning 1998 campaign?", options: ["1", "2", "3", "4"], correctIndex: 2, explanation: "Zidane, Laurent Blanc and Marcel Desailly were all dismissed during the tournament.", sourceLabel: "FIFA · France 1998 in stats", sourceUrl: FRANCE_1998_SOURCE },

  { id: "france-first-title", era: "history", difficulty: "rookie", prompt: "In which year did France win its first men's World Cup?", options: ["1986", "1990", "1998", "2006"], correctIndex: 2, explanation: "France beat Brazil 3–0 in the 1998 final.", sourceLabel: "FIFA · Finals that made history", sourceUrl: FINALS_SOURCE },
  { id: "spain-first-title", era: "history", difficulty: "rookie", prompt: "Spain won its first men's World Cup in which year?", options: ["2002", "2006", "2010", "2014"], correctIndex: 2, explanation: "Andrés Iniesta scored the extra-time winner in the 2010 final.", sourceLabel: "FIFA · Finals that made history", sourceUrl: FINALS_SOURCE },
  { id: "argentina-second-title", era: "history", difficulty: "pro", prompt: "Argentina's 3–2 final win over West Germany delivered which title number in 1986?", options: ["First", "Second", "Third", "Fourth"], correctIndex: 1, explanation: "Mexico 1986 gave Argentina its second World Cup crown.", sourceLabel: "FIFA · Finals that made history", sourceUrl: FINALS_SOURCE },
  { id: "italy-2006-title", era: "history", difficulty: "pro", prompt: "Italy's victory in the 2006 final was its how many-th World Cup title?", options: ["Second", "Third", "Fourth", "Fifth"], correctIndex: 2, explanation: "The Berlin triumph delivered Italy's fourth title.", sourceLabel: "Inside FIFA · Italy 2006", sourceUrl: "https://inside.fifa.com/tournaments/mens/worldcup/2006germany/news/italy-conquer-the-world-as-germany-wins-friends" },
  { id: "brazil-2002-title", era: "history", difficulty: "rookie", prompt: "Brazil's 2002 final win secured its how many-th World Cup title?", options: ["Third", "Fourth", "Fifth", "Sixth"], correctIndex: 2, explanation: "Ronaldo's two final goals helped Brazil become five-time champions.", sourceLabel: "FIFA · Finals that made history", sourceUrl: FINALS_SOURCE },
  { id: "substitutions-2022", era: "history", difficulty: "pro", prompt: "How many substitutions were teams permitted in normal time at Qatar 2022?", options: ["3", "4", "5", "6"], correctIndex: 2, explanation: "Teams could make five in normal time, plus another in extra time.", sourceLabel: "FIFA · Substitution history", sourceUrl: SUBSTITUTIONS_SOURCE },
];

export function utcDay(now = Date.now()) {
  return Math.floor(now / 86_400_000);
}

export function getDailyQuizQuestions(day = utcDay()) {
  const selected: QuizQuestion[] = [];
  for (let step = 0; selected.length < 5; step += 1) {
    const candidate = QUIZ_BANK[(day * 7 + step * 11) % QUIZ_BANK.length];
    if (!selected.some((question) => question.id === candidate.id)) selected.push(candidate);
  }
  return selected;
}

export function getDailyQuizRound(now = Date.now()): QuizRound {
  const day = utcDay(now);
  const questions = getDailyQuizQuestions(day).map((question) => ({
    id: question.id,
    era: question.era,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options,
    sourceLabel: question.sourceLabel,
    sourceUrl: question.sourceUrl,
  }));
  return {
    roundId: `world-cup-daily-${day}`,
    edition: "World Cup Daily · sourced facts",
    validForUtcDay: day,
    questions,
    maxPoints: 70,
  };
}

export function gradeDailyQuiz(roundId: string, answers: number[], now = Date.now()) {
  const day = utcDay(now);
  if (roundId !== `world-cup-daily-${day}`) throw new Error("This daily quiz round has expired");
  const questions = getDailyQuizQuestions(day);
  if (answers.length !== questions.length) throw new Error("Exactly five answers are required");
  answers.forEach((answer, index) => {
    if (!Number.isInteger(answer) || answer < 0 || answer >= questions[index].options.length) {
      throw new Error(`Answer ${index + 1} is outside the available options`);
    }
  });
  const results = questions.map((question, index) => ({
    questionId: question.id,
    correct: answers[index] === question.correctIndex,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
  }));
  const score = results.filter((result) => result.correct).length;
  const points = score * 10 + (score === questions.length ? 20 : 0);
  return { day, score, points, results };
}
