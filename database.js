import * as SQLite from 'expo-sqlite';

// ── Default data (inline, no external import) ─────────────────────────────────
const DEFAULT_TIERS = [
  { id: 1, name: 'Kondygnacja 1 \u2013 G\u00f3ra (~1 m)', subtitle: 'Jasny cie\u0144 przy \u015bcianie', position: 0 },
  { id: 2, name: 'Kondygnacja 2 \u2013 \u015arodek (~60 cm)', subtitle: 'Kilka godzin s\u0142o\u0144ca po po\u0142udniu', position: 1 },
  { id: 3, name: 'Kondygnacja 3 \u2013 D\u00f3\u0142 (przy ziemi)', subtitle: 'Bezpo\u015brednie s\u0142o\u0144ce od 1 m', position: 2 },
];

const DEFAULT_PLANTS = [
  {
    id: 1, tier_id: 1, position: 0,
    name: 'Mi\u0119ta marokaska', type: 'wielosezonowa',
    water_days: 2, water_amount: 'obficie', sun: 'jasny cie\u0144',
    check_tip: 'Wk\u0142\u00f3j palec 1 cm w g\u0142\u0105b. Je\u015bli suche \u2014 podlej od razu. W skrzynce 12 cm gleby wysycha szybko, mi\u0119ty nie toleruj\u0105 przesychania.',
    prune_tip: 'Tnij wierzcho\u0142ki p\u0119d\u00f3w o 1/3 co 2\u20133 tygodnie. Gdy ro\u015blina ro\u015bnie tylko w g\u00f3r\u0119, uszczypnij czubek \u2014 wymu\u015bzi rozga\u0142\u0119zienie. Usuwa\u0107 kwiatostany natychmiast.',
    kitchen_tip: 'Zbieraj zawsze od wierzcho\u0142ka, maksymalnie 1/3 ro\u015bliny naraz. Najlepiej rano. Doskona\u0142a do herbaty, lemonad i deser\u00f3w.',
    notes: 'Strefa lewa. Bardzo ekspansywna, ale 9 cm g\u0142\u0119boko\u015bci dobrze j\u0105 ogranicza.',
  },
  {
    id: 2, tier_id: 1, position: 1,
    name: 'Mi\u0119ta czekoladowa', type: 'wielosezonowa',
    water_days: 2, water_amount: 'obficie', sun: 'jasny cie\u0144',
    check_tip: 'Identycznie jak mi\u0119ta marokaska. Obie skrzynki podlewaj niezale\u017cnie \u2014 lewa mo\u017ce wysycha\u0107 szybciej.',
    prune_tip: 'Identycznie jak mi\u0119ta marokaska. Mo\u017cesz przyci\u0105\u0107 obie tego samego dnia. Jesieni\u0105 skr\u00f3\u0107 do 5 cm nad ziemi\u0105 \u2014 wiosn\u0105 odrodzi si\u0119 silniej.',
    kitchen_tip: 'Wyj\u0105tkowa do deser\u00f3w, koktajli i herbaty. Zbieraj m\u0142ode li\u015bcie z wierzcho\u0142ka. Tnij no\u017cyczkami, nie wyrywaj.',
    notes: 'Strefa prawa. Trzymaj osobno od mi\u0119ty marokaskiej.',
  },
  {
    id: 3, tier_id: 2, position: 0,
    name: 'Rozmaryn', type: 'wielosezonowy',
    water_days: 5, water_amount: 'umiarkowanie', sun: 'kilka godzin s\u0142o\u0144ca',
    check_tip: 'Palec 3 cm w g\u0142\u0105b \u2014 podlej dopiero gdy zupe\u0142nie suche. \u017b\u00f3\u0142kni\u0119cie li\u015bci od \u015brodka = za mokro, to najcz\u0119stszy b\u0142\u0105d.',
    prune_tip: 'Tnij ga\u0142\u0105zki regularnie przez ca\u0142y sezon \u2014 bez tego zdrewnieje od do\u0142u i przestanie si\u0119 rozga\u0142\u0119zia\u0107. Nigdy nie tnij w stare drewno bez li\u015bci. Wiosn\u0105 skr\u00f3\u0107 o 1/3.',
    kitchen_tip: 'Tnij ga\u0142\u0105zki z wierzcho\u0142ka, zdejmuj ig\u0142astki zsuwaj\u0105c palcami w d\u00f3\u0142 ga\u0142\u0105zki. Silny aromat \u2014 u\u017cywaj ostro\u017cnie.',
    notes: 'Na zim\u0119 wkop do donicy >14 cm gdy noce schodz\u0105 poni\u017cej 5\u00b0C.',
  },
  {
    id: 4, tier_id: 2, position: 1,
    name: 'Bazylia Magic Blue', type: 'jednoroczna',
    water_days: 1, water_amount: 'regularnie', sun: 'kilka godzin s\u0142o\u0144ca',
    check_tip: 'Bazylia zwisa li\u015b\u0107mi przy pierwszych oznakach suszy \u2014 reaguj natychmiast. Pod\u0142o\u017ce wilgotne (nie mokre) przez ca\u0142y czas.',
    prune_tip: 'Uszczypnij czubek gdy ro\u015blina ma 6\u20138 li\u015bci. Usuwa\u0107 kwiatostany od razu po pojawieniu si\u0119, bo li\u015bcie gorzkniej\u0105.',
    kitchen_tip: 'Fioletowe li\u015bcie \u015bwietnie wygl\u0105daj\u0105 w sa\u0142atkach. Dodawaj na zimno lub na ko\u0144cu gotowania.',
    notes: 'Kompaktowa odmiana. Dosadzaj now\u0105 co 3\u20134 tygodnie dla ci\u0105g\u0142ych zbior\u00f3w.',
  },
  {
    id: 5, tier_id: 2, position: 2,
    name: 'Bazylia zwyk\u0142a', type: 'jednoroczna',
    water_days: 1, water_amount: 'regularnie', sun: 'kilka godzin s\u0142o\u0144ca',
    check_tip: 'Identycznie jak Magic Blue. Obie bazyle mo\u017cesz podlewa\u0107 jednocze\u015bnie \u2014 maj\u0105 te same potrzeby.',
    prune_tip: 'Identycznie jak Magic Blue. Sadzaj now\u0105 co 3\u20134 tygodnie obok przekwitaj\u0105cej.',
    kitchen_tip: 'Klasyczna do pizzy, makaronu i pesto. Tnij od wierzcho\u0142ka. Du\u017ce li\u015bcie do pesto, ma\u0142e do dekoracji.',
    notes: 'Sukcesja: gdy jedna kwitnie, masz ju\u017c gotow\u0105 nast\u0119pn\u0105.',
  },
  {
    id: 6, tier_id: 2, position: 3,
    name: 'Oregano', type: 'wielosezonowe',
    water_days: 4, water_amount: 'ma\u0142o', sun: 'kilka godzin s\u0142o\u0144ca',
    check_tip: 'Palec 2 cm \u2014 podlej gdy suche. Bardziej odporne na susz\u0119 ni\u017c bazylia, mniej ni\u017c rozmaryn.',
    prune_tip: 'Tnij wierzcho\u0142ki regularnie \u2014 wymusza krzaczystos\u0107. Po kwitnieniu skr\u00f3\u0107 o 2/3.',
    kitchen_tip: 'Najlepsze do pizzy i makaronu. Po suszeniu aromat si\u0119 wzmacnia. Zbieraj tu\u017c przed kwitnieniem.',
    notes: 'Prawy brzeg kondygnacji 2.',
  },
  {
    id: 7, tier_id: 3, position: 0,
    name: 'Kocanka / Curry', type: 'wielosezonowa',
    water_days: 7, water_amount: 'bardzo ma\u0142o', sun: 'bezpo\u015brednie s\u0142o\u0144ce',
    check_tip: 'Palec 3 cm w g\u0142\u0105b \u2014 podlej tylko gdy zupe\u0142nie suche. Mokre korzenie szybko gni\u0105. Najsuchsza ro\u015blina w zielniku.',
    prune_tip: 'Przycinaj agresywnie po kwitnieniu (sierpie\u0144) \u2014 skr\u00f3\u0107 do po\u0142owy. Bez regularnego przycinania wyrasta do 60 cm.',
    kitchen_tip: 'Li\u015bcie jako substytut curry w sosach i risotto. Bardzo intensywny smak \u2014 u\u017cywaj ostro\u017cnie.',
    notes: 'Sadzaj od strony gdzie pod\u0142o\u017ce najszybciej wyschnie.',
  },
  {
    id: 8, tier_id: 3, position: 1,
    name: 'Sza\u0142wia', type: 'wielosezonowa',
    water_days: 4, water_amount: 'umiarkowanie', sun: 'bezpo\u015brednie s\u0142o\u0144ce',
    check_tip: 'Palec 2 cm \u2014 sza\u0142wia lubi lekko przeschni\u0119te pod\u0142o\u017ce mi\u0119dzy podlewaniami. Lepiej za ma\u0142o ni\u017c za du\u017co.',
    prune_tip: 'Po kwitnieniu (czerwiec\u2013lipiec) przytnij do po\u0142owy wysoko\u015bci. Przez sezon tnij ga\u0142\u0105zki nad rozwidleniem.',
    kitchen_tip: 'Zbieraj li\u015bcie lub ca\u0142e ga\u0142\u0105zki, max 1/3 ro\u015bliny naraz. Starsze li\u015bcie s\u0105 intensywniejsze.',
    notes: 'Krzaczasta, lewy brzeg kondygnacji 3.',
  },
  {
    id: 9, tier_id: 3, position: 2,
    name: 'Tymianek', type: 'wielosezonowy',
    water_days: 5, water_amount: 'ma\u0142o', sun: 'bezpo\u015brednie s\u0142o\u0144ce',
    check_tip: 'Palec 2\u20133 cm \u2014 tymianek znosi susz\u0119 dobrze. Przesycenie wod\u0105 zabija go szybciej ni\u017c susza.',
    prune_tip: 'Tnij wierzcho\u0142ki o 1/3 regularnie. Po kwitnieniu przytnij mocno, zachowaj zielone li\u015bcie na ga\u0142\u0105zce. Co 3 lata wymie\u0144 ro\u015blin\u0119.',
    kitchen_tip: 'Tnij ga\u0142\u0105zki z wierzcho\u0142ka. Li\u015bcie zdejmij zsuwaj\u0105c palcami w d\u00f3\u0142 ga\u0142\u0105zki.',
    notes: 'Niski, k\u0119powy. Co 3 lata wymie\u0144 ro\u015blin\u0119 \u2014 drewnieje.',
  },
  {
    id: 10, tier_id: 3, position: 3,
    name: 'Cz\u0105ber g\u00f3rski', type: 'wielosezonowy',
    water_days: 4, water_amount: 'ma\u0142o', sun: 'bezpo\u015brednie s\u0142o\u0144ce',
    check_tip: 'Palec 2 cm \u2014 ro\u015bnie w skupisku, wi\u0119c wilgo\u0107 trzyma nieco d\u0142u\u017cej ni\u017c sza\u0142wia.',
    prune_tip: 'Tnij wierzcho\u0142ki regularnie \u2014 wymusza rozga\u0142\u0119zienie. Po kwitnieniu skr\u00f3\u0107 o po\u0142ow\u0119.',
    kitchen_tip: '\u015awietny do grillowania, mi\u0119s i str\u0105czkowych. Zbieraj m\u0142ode ga\u0142\u0105zki przed kwitnieniem.',
    notes: 'K\u0119powy, bli\u017cej \u015brodka kondygnacji 3.',
  },
  {
    id: 11, tier_id: 3, position: 4,
    name: 'Szczypior', type: 'wielosezonowy',
    water_days: 3, water_amount: 'regularnie', sun: 'bezpo\u015brednie s\u0142o\u0144ce',
    check_tip: 'Pod\u0142o\u017ce mo\u017ce by\u0107 lekko wilgotne przez ca\u0142y czas. Je\u015bli li\u015bcie zaczynaj\u0105 si\u0119 zwija\u0107 \u2014 za suche.',
    prune_tip: 'Tnij do 2\u20133 cm nad ziemi\u0105 \u2014 odrodzi si\u0119 w ci\u0105gu tygodnia. Nigdy nie tnij tylko wierzcho\u0142k\u00f3w.',
    kitchen_tip: 'Jedyna ro\u015blina, kt\u00f3r\u0105 mo\u017cesz \u015bcina\u0107 prawie do zera bez szkody. Po zbiorze podlej i daj 5\u20137 dni.',
    notes: 'Lubi wilgo\u0107, s\u0142o\u0144ce mu nie przeszkadza.',
  },
];

// ── DB ────────────────────────────────────────────────────────────────────────
let db;

export const getDb = async () => {
  if (!db) db = await SQLite.openDatabaseAsync('zielnik.db');
  return db;
};

export const initDatabase = async () => {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subtitle TEXT,
      position INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      type TEXT,
      water_days INTEGER DEFAULT 3,
      water_amount TEXT,
      sun TEXT,
      check_tip TEXT,
      prune_tip TEXT,
      kitchen_tip TEXT,
      notes TEXT,
      last_watered TEXT,
      FOREIGN KEY (tier_id) REFERENCES tiers(id)
    );
  `);

  const tierCount = await db.getFirstAsync('SELECT COUNT(*) as c FROM tiers');
  if (tierCount.c === 0) {
    for (const t of DEFAULT_TIERS) {
      await db.runAsync(
        'INSERT INTO tiers (id, name, subtitle, position) VALUES (?, ?, ?, ?)',
        [t.id, t.name, t.subtitle, t.position]
      );
    }
    for (const p of DEFAULT_PLANTS) {
      await db.runAsync(
        `INSERT INTO plants (id, tier_id, position, name, type, water_days, water_amount, sun,
          check_tip, prune_tip, kitchen_tip, notes, last_watered)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.tier_id, p.position, p.name, p.type, p.water_days,
         p.water_amount, p.sun, p.check_tip, p.prune_tip, p.kitchen_tip,
         p.notes, null]
      );
    }
  }
};

export const getTiers = async () => {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM tiers ORDER BY position ASC');
};

export const getPlantsByTier = async (tierId) => {
  const db = await getDb();
  return await db.getAllAsync(
    'SELECT * FROM plants WHERE tier_id = ? ORDER BY position ASC', [tierId]
  );
};

export const getAllPlants = async () => {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM plants ORDER BY tier_id ASC, position ASC');
};

export const getPlant = async (id) => {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM plants WHERE id = ?', [id]);
};

export const addPlant = async (plant) => {
  const db = await getDb();
  const maxPos = await db.getFirstAsync(
    'SELECT MAX(position) as m FROM plants WHERE tier_id = ?', [plant.tier_id]
  );
  const pos = (maxPos.m ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO plants (tier_id, position, name, type, water_days, water_amount, sun,
      check_tip, prune_tip, kitchen_tip, notes, last_watered)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [plant.tier_id, pos, plant.name, plant.type || '', plant.water_days || 3,
     plant.water_amount || '', plant.sun || '', plant.check_tip || '',
     plant.prune_tip || '', plant.kitchen_tip || '', plant.notes || '', null]
  );
  return result.lastInsertRowId;
};

export const updatePlant = async (plant) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE plants SET name=?, type=?, water_days=?, water_amount=?, sun=?,
      check_tip=?, prune_tip=?, kitchen_tip=?, notes=? WHERE id=?`,
    [plant.name, plant.type, plant.water_days, plant.water_amount, plant.sun,
     plant.check_tip, plant.prune_tip, plant.kitchen_tip, plant.notes, plant.id]
  );
};

export const deletePlant = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM plants WHERE id = ?', [id]);
};

export const waterPlant = async (id) => {
  const db = await getDb();
  await db.runAsync('UPDATE plants SET last_watered = ? WHERE id = ?',
    [new Date().toISOString(), id]);
};

export const movePlant = async (plantId, newTierId, newPosition) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE plants SET tier_id = ?, position = ? WHERE id = ?',
    [newTierId, newPosition, plantId]
  );
};

export const reorderPlantsInTier = async (tierId, orderedIds) => {
  const db = await getDb();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync(
      'UPDATE plants SET position = ? WHERE id = ? AND tier_id = ?',
      [i, orderedIds[i], tierId]
    );
  }
};
