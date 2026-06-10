const BLESSING_VERSES = [
  'The Lord bless you and keep you. — Num 6:24',
  'I can do all things through Christ. — Phil 4:13',
  'Trust in the Lord with all your heart. — Prov 3:5',
  'His mercies are new every morning. — Lam 3:23',
  'Fear not, for I am with you. — Isa 41:10',
  'Be still, and know that I am God. — Ps 46:10',
  'The Lord is my shepherd. — Ps 23:1',
  'Be strong and courageous. — Josh 1:9',
  'Your word is a lamp to my feet. — Ps 119:105',
  'With God all things are possible. — Matt 19:26',
];

export function getLoadingVerse(): string {
  return BLESSING_VERSES[Math.floor(Math.random() * BLESSING_VERSES.length)];
}
