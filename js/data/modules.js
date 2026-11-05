// Modules you can rebuild at a settlement. Effects are applied every day
// while the module stands. cost uses stock names; skill is needed in the crew.
export const MODULES = {
  kas: {
    id: 'kas',
    name: { nl: 'Kas', en: 'Greenhouse' },
    desc: { nl: 'Kweekt elke dag extra voedsel.', en: 'Grows extra food every day.' },
    cost: { materials: 6 },
    skill: 'farmer',
    days: 2,
    effects: { food: 6 },
  },
  waterzuivering: {
    id: 'waterzuivering',
    name: { nl: 'Waterzuivering', en: 'Water purifier' },
    desc: { nl: 'Schoon water: iedereen herstelt een beetje.', en: 'Clean water: everyone recovers a little.' },
    cost: { materials: 5, parts: 1 },
    skill: 'engineer',
    days: 2,
    effects: { health: 1 },
  },
  generator: {
    id: 'generator',
    name: { nl: 'Generator', en: 'Generator' },
    desc: { nl: 'Levert elke dag brandstof voor de trein.', en: 'Produces fuel for the train every day.' },
    cost: { materials: 4, parts: 2 },
    skill: 'mechanic',
    days: 2,
    effects: { fuel: 2 },
  },
  radio: {
    id: 'radio',
    name: { nl: 'Radio', en: 'Radio' },
    desc: { nl: 'Vangt signalen op van andere overlevers en de haven in het Noorden.', en: 'Picks up signals from other survivors and the harbour in the North.' },
    cost: { materials: 3, parts: 2 },
    skill: 'engineer',
    days: 1,
    effects: {},
    unlocks: 'radio',
  },
  kliniek: {
    id: 'kliniek',
    name: { nl: 'Kliniek', en: 'Clinic' },
    desc: { nl: 'Zieken knappen sneller op.', en: 'The sick recover faster.' },
    cost: { materials: 5, medicine: 2 },
    skill: 'medic',
    days: 2,
    effects: { health: 2 },
  },
  school: {
    id: 'school',
    name: { nl: 'School', en: 'School' },
    desc: { nl: 'Kinderen leren, volwassenen krijgen hoop terug.', en: 'Children learn, adults get hope back.' },
    cost: { materials: 4 },
    skill: 'teacher',
    days: 2,
    effects: { morale: 2 },
  },
};

export const MODULE_IDS = Object.keys(MODULES);
