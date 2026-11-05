// Content for the passengers. Names are from many countries so the train
// really carries "one hundred people from all over the world".

export const COUNTRIES = [
  { code: 'NL', name: { nl: 'Nederland', en: 'Netherlands' }, first: ['Sanne', 'Daan', 'Lotte', 'Bram'], last: ['de Vries', 'Jansen', 'Bakker', 'Visser'] },
  { code: 'DE', name: { nl: 'Duitsland', en: 'Germany' }, first: ['Lena', 'Felix', 'Hannah', 'Jonas'], last: ['Müller', 'Schmidt', 'Weber'] },
  { code: 'FR', name: { nl: 'Frankrijk', en: 'France' }, first: ['Camille', 'Louis', 'Léa', 'Hugo'], last: ['Martin', 'Bernard', 'Dubois'] },
  { code: 'ES', name: { nl: 'Spanje', en: 'Spain' }, first: ['Lucía', 'Mateo', 'Carmen', 'Diego'], last: ['García', 'Torres', 'Ruiz'] },
  { code: 'IT', name: { nl: 'Italië', en: 'Italy' }, first: ['Giulia', 'Marco', 'Sofia', 'Luca'], last: ['Rossi', 'Ferrari', 'Conti'] },
  { code: 'PL', name: { nl: 'Polen', en: 'Poland' }, first: ['Zofia', 'Piotr', 'Anna', 'Tomasz'], last: ['Nowak', 'Kowalski', 'Wiśniewska'] },
  { code: 'TR', name: { nl: 'Turkije', en: 'Turkey' }, first: ['Elif', 'Mehmet', 'Zeynep', 'Ahmet'], last: ['Yılmaz', 'Kaya', 'Demir'] },
  { code: 'MA', name: { nl: 'Marokko', en: 'Morocco' }, first: ['Yasmine', 'Youssef', 'Salma', 'Amine'], last: ['El Amrani', 'Benali', 'Idrissi'] },
  { code: 'NG', name: { nl: 'Nigeria', en: 'Nigeria' }, first: ['Adaeze', 'Chinedu', 'Ngozi', 'Emeka'], last: ['Okafor', 'Balogun', 'Eze'] },
  { code: 'EG', name: { nl: 'Egypte', en: 'Egypt' }, first: ['Nour', 'Omar', 'Hana', 'Karim'], last: ['Hassan', 'Mansour', 'Fouad'] },
  { code: 'IN', name: { nl: 'India', en: 'India' }, first: ['Priya', 'Arjun', 'Ananya', 'Rohan'], last: ['Sharma', 'Patel', 'Iyer'] },
  { code: 'CN', name: { nl: 'China', en: 'China' }, first: ['Mei', 'Wei', 'Lin', 'Jun'], last: ['Wang', 'Li', 'Zhang'] },
  { code: 'JP', name: { nl: 'Japan', en: 'Japan' }, first: ['Yuki', 'Haruto', 'Aoi', 'Sota'], last: ['Sato', 'Tanaka', 'Suzuki'] },
  { code: 'KR', name: { nl: 'Zuid-Korea', en: 'South Korea' }, first: ['Ji-woo', 'Min-jun', 'Seo-yeon', 'Dong-hyun'], last: ['Kim', 'Park', 'Choi'] },
  { code: 'BR', name: { nl: 'Brazilië', en: 'Brazil' }, first: ['Ana', 'João', 'Beatriz', 'Rafael'], last: ['Silva', 'Souza', 'Oliveira'] },
  { code: 'MX', name: { nl: 'Mexico', en: 'Mexico' }, first: ['Valeria', 'Santiago', 'Itzel', 'Emiliano'], last: ['Hernández', 'López', 'Ramírez'] },
  { code: 'US', name: { nl: 'Verenigde Staten', en: 'United States' }, first: ['Emma', 'Tyler', 'Jasmine', 'Caleb'], last: ['Johnson', 'Brown', 'Walker'] },
  { code: 'AU', name: { nl: 'Australië', en: 'Australia' }, first: ['Olivia', 'Noah', 'Ruby', 'Jack'], last: ['Smith', 'Wilson', 'Taylor'] },
  { code: 'ID', name: { nl: 'Indonesië', en: 'Indonesia' }, first: ['Dewi', 'Budi', 'Sari', 'Agus'], last: ['Wijaya', 'Pratama', 'Susanto'] },
  { code: 'ZA', name: { nl: 'Zuid-Afrika', en: 'South Africa' }, first: ['Thandi', 'Sipho', 'Lerato', 'Themba'], last: ['Dlamini', 'Nkosi', 'Mokoena'] },
];

// A job gives a passenger one skill. Skills unlock actions later on (building
// modules, treating the sick, scavenging). Children have no skill yet.
export const JOBS = [
  { id: 'doctor', skill: 'medic', name: { nl: 'Arts', en: 'Doctor' } },
  { id: 'nurse', skill: 'medic', name: { nl: 'Verpleegkundige', en: 'Nurse' } },
  { id: 'mechanic', skill: 'mechanic', name: { nl: 'Monteur', en: 'Mechanic' } },
  { id: 'engineer', skill: 'engineer', name: { nl: 'Ingenieur', en: 'Engineer' } },
  { id: 'farmer', skill: 'farmer', name: { nl: 'Boer', en: 'Farmer' } },
  { id: 'cook', skill: 'cook', name: { nl: 'Kok', en: 'Cook' } },
  { id: 'teacher', skill: 'teacher', name: { nl: 'Leraar', en: 'Teacher' } },
  { id: 'soldier', skill: 'soldier', name: { nl: 'Soldaat', en: 'Soldier' } },
  { id: 'clerk', skill: 'none', name: { nl: 'Administratief medewerker', en: 'Office clerk' } },
  { id: 'student', skill: 'none', name: { nl: 'Student', en: 'Student' } },
  { id: 'child', skill: 'none', child: true, name: { nl: 'Kind', en: 'Child' } },
];

export const SKILLS = ['medic', 'mechanic', 'engineer', 'farmer', 'cook', 'teacher', 'soldier', 'none'];

// Hidden personality traits. They affect how a passenger behaves in events
// and in the sacrifice choices (for example "loyal" people volunteer more often).
export const TRAITS = ['optimistic', 'bitter', 'loyal', 'selfish', 'caring', 'stubborn', 'brave', 'anxious'];
