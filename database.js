import * as SQLite from 'expo-sqlite';
import { DEFAULT_TIERS, DEFAULT_PLANTS } from '../data/defaultPlants';

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

  // Seed defaults if empty
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

// ── Tiers ─────────────────────────────────────────────────────────────────────
export const getTiers = async () => {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM tiers ORDER BY position ASC');
};

// ── Plants ────────────────────────────────────────────────────────────────────
export const getPlantsByTier = async (tierId) => {
  const db = await getDb();
  return await db.getAllAsync(
    'SELECT * FROM plants WHERE tier_id = ? ORDER BY position ASC',
    [tierId]
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
    'SELECT MAX(position) as m FROM plants WHERE tier_id = ?',
    [plant.tier_id]
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
      check_tip=?, prune_tip=?, kitchen_tip=?, notes=?
     WHERE id=?`,
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
  const now = new Date().toISOString();
  await db.runAsync('UPDATE plants SET last_watered = ? WHERE id = ?', [now, id]);
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
