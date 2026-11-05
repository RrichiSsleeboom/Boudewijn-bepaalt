// Events on the road. Each one has choices. An effect uses these keys:
//   food, fuel, ammo, medicine, materials, parts  - stock change (never below 0)
//   morale, health                                 - change for everyone alive
//   oneHealth                                      - change for one random passenger
//   conscience                                     - change in the conscience score

export const EVENTS = [
  {
    id: 'schuur',
    title: { nl: 'Verlaten schuur', en: 'Abandoned barn' },
    text: {
      nl: 'Langs het spoor staat een schuur. De deur hangt scheef, maar er ligt vast nog wat in.',
      en: 'There is a barn beside the track. The door hangs crooked, but there may be something inside.',
    },
    choices: [
      {
        label: { nl: 'Doorzoeken', en: 'Search it' },
        desc: { nl: 'Kost even tijd en moraal.', en: 'Takes time and some morale.' },
        effect: { food: 35, morale: -2 },
        result: { nl: 'Er liggen wat blikken en graan. Het is niet veel.', en: 'There are a few tins and some grain. Not much.' },
      },
      {
        label: { nl: 'Laten liggen', en: 'Leave it' },
        desc: { nl: 'Niemand weet wat er in de schuur had kunnen zitten.', en: 'Nobody will know what might have been inside.' },
        effect: { conscience: 1 },
        result: { nl: 'Je rijdt door. Niemand weet wat er in de schuur had kunnen zitten.', en: 'You keep going. Nobody will ever know what was in the barn.' },
      },
    ],
  },
  {
    id: 'koorts',
    title: { nl: 'Koorts', en: 'Fever' },
    text: {
      nl: 'Een kind in wagon drie heeft hoge koorts. De moeder kijkt je aan.',
      en: 'A child in carriage three has a high fever. The mother looks at you.',
    },
    choices: [
      {
        label: { nl: 'Medicijnen geven', en: 'Give medicine' },
        desc: { nl: 'Kost één medicijn.', en: 'Costs one medicine.' },
        effect: { medicine: -1, oneHealth: 25, conscience: 2 },
        result: { nl: 'Het kind knapt op. De moeder huilt van opluchting.', en: 'The child recovers. The mother cries with relief.' },
      },
      {
        label: { nl: 'Afwachten', en: 'Wait' },
        desc: { nl: 'Je spaart het medicijn.', en: 'You save the medicine.' },
        effect: { oneHealth: -25, morale: -3 },
        result: { nl: 'De koorts blijft. De wagon wordt stil.', en: 'The fever stays. The carriage goes quiet.' },
      },
    ],
  },
  {
    id: 'brandstofdief',
    title: { nl: 'Brandstofdief', en: 'Fuel thief' },
    text: {
      nl: 'Iemand is bij de brandstoftank betrapt. Hij zegt dat hij het voor zijn kinderen deed.',
      en: 'Someone was caught at the fuel tank. He says he did it for his children.',
    },
    choices: [
      {
        label: { nl: 'Vergeven', en: 'Forgive him' },
        desc: { nl: 'Er verdwijnt wat brandstof.', en: 'A little fuel is gone.' },
        effect: { fuel: -3, morale: 2, conscience: 3 },
        result: { nl: 'Hij belooft het niet meer te doen. Sommigen vinden het goed, anderen niet.', en: 'He promises never to do it again. Some think it is right, others do not.' },
      },
      {
        label: { nl: 'Straffen', en: 'Punish him' },
        desc: { nl: 'De trein wordt harder en kouder.', en: 'The train grows harder and colder.' },
        effect: { morale: -6, conscience: -4 },
        result: { nl: 'Hij wordt apart gezet. De sfeer in de trein is veranderd.', en: 'He is put apart. The mood on the train has changed.' },
      },
    ],
  },
  {
    id: 'verdwaald',
    title: { nl: 'Verdwaalde overlevende', en: 'Lost survivor' },
    text: {
      nl: 'Langs de rails staat een man die met zijn armen zwaait. Hij is alleen.',
      en: 'A man stands beside the rails waving his arms. He is alone.',
    },
    choices: [
      {
        label: { nl: 'Opnemen', en: 'Take him in' },
        desc: { nl: 'Eén mond extra om te voeden.', en: 'One more mouth to feed.' },
        effect: { food: -8, morale: 4, conscience: 5 },
        result: { nl: 'De man krijgt een plek in een wagon. Hij huilt, en de trein ook een beetje.', en: 'The man gets a seat in a carriage. He cries, and the train does too, a little.' },
      },
      {
        label: { nl: 'Voorbijrijden', en: 'Drive past' },
        desc: { nl: 'De trein houdt niet stil.', en: 'The train does not stop.' },
        effect: { morale: -2, conscience: -6 },
        result: { nl: 'Je rijdt door. In de wagons wordt er niet meer gepraat.', en: 'You drive on. Nobody in the carriages talks about it.' },
      },
    ],
  },
  {
    id: 'geboorte',
    title: { nl: 'Geboorte', en: 'Birth' },
    text: {
      nl: 'Een vrouw gaat in de wagon op de vloer bevallen. Er is een arts nodig, of op zijn minst veel handen.',
      en: 'A woman goes into labour on the floor of a carriage. She needs a doctor, or at least many hands.',
    },
    choices: [
      {
        label: { nl: 'Helpen met medicijnen', en: 'Help with medicine' },
        desc: { nl: 'Kost één medicijn.', en: 'Costs one medicine.' },
        effect: { medicine: -1, morale: 8, conscience: 3 },
        result: { nl: 'Het kind is gezond. De hele wagon juicht.', en: 'The baby is healthy. The whole carriage cheers.' },
      },
      {
        label: { nl: 'Zonder medicijnen', en: 'Without medicine' },
        desc: { nl: 'Gevaarlijk voor moeder en kind.', en: 'Dangerous for mother and child.' },
        effect: { oneHealth: -15, morale: 4 },
        result: { nl: 'Het gaat goed, maar het was zwaar.', en: 'It goes well, but it was hard.' },
      },
    ],
  },
  {
    id: 'ruzie',
    title: { nl: 'Ruzie', en: 'Fight' },
    text: {
      nl: 'Twee passagiers vechten om een deken. Het escaleert snel.',
      en: 'Two passengers are fighting over a blanket. It escalates quickly.',
    },
    choices: [
      {
        label: { nl: 'Bemiddelen', en: 'Mediate' },
        desc: { nl: 'Kost even tijd.', en: 'Takes some time.' },
        effect: { morale: -2, conscience: 2 },
        result: { nl: 'Ze delen de deken. Het is stil, maar niet vriendelijk.', en: 'They share the blanket. It is quiet, though not friendly.' },
      },
      {
        label: { nl: 'Laten gebeuren', en: 'Let it happen' },
        desc: { nl: 'Iemand raakt gewond.', en: 'Someone gets hurt.' },
        effect: { morale: -6, oneHealth: -30 },
        result: { nl: 'Eén van hen wordt zwaar gewond. De rest kijkt weg.', en: 'One of them is badly hurt. The rest look away.' },
      },
    ],
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));
