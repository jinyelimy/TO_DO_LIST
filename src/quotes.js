const quoteOpenings = [
  "작은 꾸준함은",
  "오늘의 성실함은",
  "담백한 반복은",
  "조용한 집중은",
  "한 번의 실천은",
  "천천한 전진은",
  "가벼운 시작은",
  "흔들려도 이어 가는 마음은",
];

const quoteTargets = [
  "결국 큰 변화를",
  "내일의 자신감을",
  "생각보다 단단한 흐름을",
  "멀리 가는 리듬을",
  "마음이 놓이는 하루를",
  "후회보다 선명한 결과를",
  "기회와 닿는 준비를",
  "스스로를 믿는 근거를",
];

const quoteActions = [
  "조용히 만들어 낸다.",
  "한 칸씩 쌓아 올린다.",
  "눈에 보이지 않아도 자라게 한다.",
  "서두르지 않아도 분명히 남긴다.",
  "작아 보여도 방향을 바꿔 놓는다.",
  "평범한 하루를 특별하게 바꾼다.",
  "흔들리는 마음을 다시 세운다.",
  "결심을 현실로 데려온다.",
];

const quoteClosings = [
  "오늘도 한 걸음이면 충분하다.",
  "완벽보다 실행을 먼저 믿어보자.",
  "지금의 한 칸이 내일의 여유가 된다.",
  "멈추지 않으면 흐름은 다시 살아난다.",
];

const quoteSpeakers = [
  "오늘의 다짐",
  "작은 습관 기록",
  "차분한 메모",
  "하루의 문장",
  "천천한 용기",
  "집중의 기록",
  "마음의 체크리스트",
  "꾸준함의 노트",
];

function buildQuoteLibrary() {
  const quotes = [];
  let id = 1;

  for (const opening of quoteOpenings) {
    for (const target of quoteTargets) {
      for (const action of quoteActions) {
        for (const closing of quoteClosings) {
          quotes.push({
            id: `quote-${id}`,
            text: `${opening} ${target} ${action} ${closing}`,
            author: quoteSpeakers[id % quoteSpeakers.length],
          });
          id += 1;
        }
      }
    }
  }

  return quotes;
}

export const quoteLibrary = buildQuoteLibrary();

export function getDailyQuoteIndex(dateText) {
  const seed = Array.from(dateText).reduce(
    (accumulator, character, index) => accumulator + character.charCodeAt(0) * (index + 17),
    0,
  );

  return seed % quoteLibrary.length;
}

export function getDailyQuote(dateText) {
  return quoteLibrary[getDailyQuoteIndex(dateText)];
}
