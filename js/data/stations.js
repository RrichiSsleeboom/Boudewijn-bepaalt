// The route from the start to the harbour in the north. distance is the number
// of days to the next station; fuel per leg is distance * 2. danger is the chance
// of a zombie attack on the way in. loot is what a full scavenge can bring.
// settlement stations are places where survivors live and modules can be built.
export const ROUTE = [
  { id: 'oostrand', name: { nl: 'Oostrand', en: 'Oostrand' }, distance: 3, danger: 0.1, settlement: true,
    loot: { food: 180, fuel: 8, materials: 4, ammo: 6, medicine: 2, parts: 2 } },
  { id: 'kolenbrug', name: { nl: 'Kolenbrug', en: 'Coal Bridge' }, distance: 3, danger: 0.3,
    loot: { food: 150, fuel: 10, materials: 3, ammo: 4, medicine: 1, parts: 2 } },
  { id: 'zoutweg', name: { nl: 'Zoutweg', en: 'Salt Road' }, distance: 2, danger: 0.4,
    loot: { food: 120, fuel: 6, materials: 2, ammo: 5, medicine: 1, parts: 1 } },
  { id: 'witte-brug', name: { nl: 'Witte Brug', en: 'White Bridge' }, distance: 3, danger: 0.5, settlement: true,
    loot: { food: 200, fuel: 4, materials: 6, ammo: 4, medicine: 3, parts: 3 } },
  { id: 'mistpoort', name: { nl: 'Mistpoort', en: 'Mist Gate' }, distance: 2, danger: 0.6,
    loot: { food: 110, fuel: 6, materials: 2, ammo: 7, medicine: 1, parts: 2 } },
  { id: 'dorpswaard', name: { nl: 'Dorpswaard', en: 'Village Yard' }, distance: 3, danger: 0.5, settlement: true,
    loot: { food: 170, fuel: 5, materials: 5, ammo: 4, medicine: 2, parts: 2 } },
  { id: 'stalen-veld', name: { nl: 'Stalen Veld', en: 'Steel Field' }, distance: 3, danger: 0.7,
    loot: { food: 100, fuel: 8, materials: 6, ammo: 8, medicine: 1, parts: 4 } },
  { id: 'hoge-veen', name: { nl: 'Hoge Veen', en: 'High Moor' }, distance: 2, danger: 0.6, settlement: true,
    loot: { food: 190, fuel: 4, materials: 3, ammo: 3, medicine: 3, parts: 1 } },
  { id: 'nieuw-ardenne', name: { nl: 'Nieuw-Ardenne', en: 'New Ardennes' }, distance: 3, danger: 0.8,
    loot: { food: 130, fuel: 7, materials: 4, ammo: 9, medicine: 2, parts: 3 } },
  { id: 'noordhaven', name: { nl: 'Noordhaven', en: 'North Harbour' }, distance: 0, danger: 0.4, haven: true, settlement: true,
    loot: { food: 250, fuel: 12, materials: 8, ammo: 6, medicine: 4, parts: 4 } },
];

export const FUEL_PER_DAY = 2;
export const HAVEN_INDEX = ROUTE.findIndex(s => s.haven);
