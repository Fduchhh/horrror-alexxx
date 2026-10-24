import { LockerObject, DoorObject, PickupItem } from '../types/game';

export interface WallSegment {
  x: number;
  z: number;
  w: number; // width along X
  d: number; // depth along Z
  h: number; // height (default 3.5)
}

export interface LightFixture {
  position: [number, number, number];
  color: number;
  intensity: number;
  distance: number;
  isFlickering: boolean;
  type: 'fluorescent' | 'emergency_red' | 'cold_morgue';
}

export interface HospitalMapData {
  spawnPosition: [number, number, number];
  spawnRotationY: number;
  walls: WallSegment[];
  lockers: LockerObject[];
  doors: DoorObject[];
  items: PickupItem[];
  lights: LightFixture[];
  patrolWaypoints: [number, number, number][];
}

export function generateHospitalMap(): HospitalMapData {
  // Spawn in Ward 4
  const spawnPosition: [number, number, number] = [-12, 1.6, -12];
  const spawnRotationY = Math.PI / 2;

  // Hospital Layout (coordinate bounds roughly X: -26 to 26, Z: -26 to 26)
  const walls: WallSegment[] = [
    // Outer perimeter walls
    { x: 0, z: -25, w: 52, d: 0.8, h: 3.5 },
    { x: 0, z: 25, w: 52, d: 0.8, h: 3.5 },
    { x: -25, z: 0, w: 0.8, d: 50, h: 3.5 },
    { x: 25, z: 0, w: 0.8, d: 50, h: 3.5 },

    // --- WARD 4 (Spawn Room: X: -25 to -7, Z: -25 to -7) ---
    { x: -7, z: -18, w: 0.8, d: 14, h: 3.5 }, // east wall with door gap at Z: -9
    { x: -16, z: -7, w: 18, d: 0.8, h: 3.5 }, // south wall

    // --- WARD 3 (Adjacent: X: -25 to -7, Z: -7 to 7) ---
    { x: -7, z: 0, w: 0.8, d: 14, h: 3.5 }, // east wall with door gap at Z: 0
    { x: -16, z: 7, w: 18, d: 0.8, h: 3.5 }, // south wall

    // --- RESTROOMS / SHOWERS (X: -25 to -7, Z: 7 to 25) ---
    { x: -7, z: 16, w: 0.8, d: 16, h: 3.5 },

    // --- CENTRAL CORRIDOR (West-to-East: Z: -4 to 4, X: -7 to 7) ---
    // North partition of central hallway
    { x: -1, z: -4, w: 10, d: 0.8, h: 3.5 },
    // South partition of central hallway
    { x: -1, z: 4, w: 10, d: 0.8, h: 3.5 },

    // --- DOCTOR'S OFFICE / RECEPTION (X: -6 to 6, Z: -25 to -10) ---
    { x: 6, z: -17, w: 0.8, d: 15, h: 3.5 },
    { x: 0, z: -10, w: 12, d: 0.8, h: 3.5 }, // south wall facing hallway

    // --- TREATMENT / SHOCK THERAPY (East: X: 7 to 25, Z: -25 to -7) ---
    { x: 7, z: -16, w: 0.8, d: 16, h: 3.5 },
    { x: 16, z: -7, w: 18, d: 0.8, h: 3.5 },

    // --- MORGUE & GENERATOR VAULT (East: X: 7 to 25, Z: 7 to 25) ---
    { x: 7, z: 16, w: 0.8, d: 16, h: 3.5 },
    { x: 16, z: 7, w: 18, d: 0.8, h: 3.5 },

    // --- MAIN EXIT GATE ANTECHAMBER (South: X: -5 to 5, Z: 18 to 25) ---
    { x: -5, z: 21, w: 0.8, d: 8, h: 3.5 },
    { x: 5, z: 21, w: 0.8, d: 8, h: 3.5 },
  ];

  // Lockers where the player can press E to hide!
  const lockers: LockerObject[] = [
    // Locker 1: Inside starting room (Ward 4) - safe tutorial locker
    { id: 'locker_ward4', position: [-22, 1.25, -22], rotationY: 0, isOccupied: false },

    // Locker 2: In the West Hallway near Ward 3
    { id: 'locker_west_hall', position: [-8.5, 1.25, -2], rotationY: Math.PI / 2, isOccupied: false },

    // Locker 3: Central Hallway near Reception
    { id: 'locker_central_hall', position: [4.5, 1.25, -2], rotationY: -Math.PI / 2, isOccupied: false },

    // Locker 4: Doctor's Office
    { id: 'locker_doc_office', position: [4.5, 1.25, -22], rotationY: Math.PI, isOccupied: false },

    // Locker 5: Treatment Room / Operating Ward
    { id: 'locker_treatment', position: [23, 1.25, -12], rotationY: -Math.PI / 2, isOccupied: false },

    // Locker 6: East Hallway
    { id: 'locker_east_hall', position: [8.5, 1.25, 2], rotationY: Math.PI / 2, isOccupied: false },

    // Locker 7: Morgue / Generator Room (crucial for hiding when generator starts!)
    { id: 'locker_morgue_1', position: [22, 1.25, 22], rotationY: Math.PI, isOccupied: false },
    { id: 'locker_morgue_2', position: [10, 1.25, 22], rotationY: Math.PI, isOccupied: false },
  ];

  // Doors
  const doors: DoorObject[] = [
    // Ward 4 door to corridor (starts open slightly)
    {
      id: 'door_ward4',
      position: [-7, 1.5, -9],
      rotationY: 0,
      isOpen: true,
      isLocked: false,
      name: 'Палата №4'
    },
    // Doctor's office door (requires key from Ward 3)
    {
      id: 'door_doc_office',
      position: [0, 1.5, -10],
      rotationY: Math.PI / 2,
      isOpen: false,
      isLocked: true,
      requiredKeyId: 'key_doc_office',
      name: 'Ординаторская'
    },
    // Morgue Vault door (requires keycard from Doctor's office)
    {
      id: 'door_morgue',
      position: [7, 1.5, 9],
      rotationY: 0,
      isOpen: false,
      isLocked: true,
      requiredKeyId: 'keycard_morgue',
      name: 'Блок "Морг" и Генераторная'
    },
    // Treatment room door
    {
      id: 'door_treatment',
      position: [7, 1.5, -9],
      rotationY: 0,
      isOpen: false,
      isLocked: false,
      name: 'Процедурная'
    },
    // Main heavy exit gate (requires generator activated + exit card)
    {
      id: 'door_main_exit',
      position: [0, 1.5, 24.5],
      rotationY: Math.PI / 2,
      isOpen: false,
      isLocked: true,
      requiredKeyId: 'keycard_master_exit',
      name: 'ГЛАВНЫЙ ВЫХОД'
    }
  ];

  // Collectible items in the asylum
  const items: PickupItem[] = [
    // Starting flashlight right next to player in Ward 4
    {
      id: 'item_flashlight_battery_1',
      type: 'battery',
      name: 'Батарейка 9V',
      position: [-10, 0.9, -15],
      pickedUp: false
    },
    // Note in Ward 4
    {
      id: 'item_note_1',
      type: 'note',
      name: 'Записка выжившего',
      position: [-14, 0.9, -10],
      itemData: {
        text: '«Если ты очнулся — не шуми! Пациент Ноль бродит по коридорам. Он слеп на расстоянии, но отлично слышит бег и видит луч фонарика. ПРЯЧЬСЯ В ШКАФАХ (E) и задерживай дыхание (Пробел). Ключ от ординаторской лежит в соседней палате №3 на каталке...»'
      },
      pickedUp: false
    },
    // Key to Doctor's Office in Ward 3
    {
      id: 'key_doc_office',
      type: 'key',
      name: 'Ключ от ординаторской',
      position: [-18, 0.9, 0],
      pickedUp: false
    },
    // Battery in corridor cart
    {
      id: 'item_battery_corridor',
      type: 'battery',
      name: 'Батарейка для фонарика',
      position: [-5, 0.9, 1],
      pickedUp: false
    },
    // Morgue Keycard in Doctor's Office
    {
      id: 'keycard_morgue',
      type: 'key',
      name: 'Ключ-карта от Морского блока',
      position: [2, 0.9, -20],
      pickedUp: false
    },
    // Adrenaline syringe in Treatment Room
    {
      id: 'item_adrenaline',
      type: 'adrenaline',
      name: 'Шприц с адреналином',
      position: [18, 0.9, -16],
      pickedUp: false
    },
    // Master Exit Card in Morgue
    {
      id: 'keycard_master_exit',
      type: 'key',
      name: 'Мастер-карта от Главного Выхода',
      position: [21, 0.9, 18],
      pickedUp: false
    },
    // Battery in Morgue
    {
      id: 'item_battery_morgue',
      type: 'battery',
      name: 'Запасная батарейка',
      position: [15, 0.9, 21],
      pickedUp: false
    }
  ];

  // Lighting fixtures around the asylum
  const lights: LightFixture[] = [
    // Ward 4 flickering ceiling tube
    { position: [-16, 3.2, -16], color: 0x98f5b8, intensity: 1.2, distance: 9, isFlickering: true, type: 'fluorescent' },
    // West hallway flickering light
    { position: [-7, 3.2, 0], color: 0x86efac, intensity: 1.5, distance: 11, isFlickering: true, type: 'fluorescent' },
    // Central junction emergency red beacon
    { position: [0, 3.2, 0], color: 0xef4444, intensity: 2.2, distance: 13, isFlickering: false, type: 'emergency_red' },
    // Doctor's office desk lamp glow
    { position: [2, 1.8, -19], color: 0xfef08a, intensity: 1.0, distance: 7, isFlickering: false, type: 'fluorescent' },
    // East corridor
    { position: [7, 3.2, 0], color: 0x6ee7b7, intensity: 1.4, distance: 10, isFlickering: true, type: 'fluorescent' },
    // Treatment room harsh white cold light
    { position: [17, 3.2, -16], color: 0xe0f2fe, intensity: 1.8, distance: 12, isFlickering: true, type: 'fluorescent' },
    // Morgue deep cold blue light
    { position: [17, 3.2, 17], color: 0x38bdf8, intensity: 1.6, distance: 12, isFlickering: false, type: 'cold_morgue' },
    // Main exit gate warning light
    { position: [0, 3.2, 22], color: 0xdc2626, intensity: 2.0, distance: 10, isFlickering: true, type: 'emergency_red' },
  ];

  // Monster patrol loop waypoints
  const patrolWaypoints: [number, number, number][] = [
    [0, 1.5, 0],       // Central Junction
    [-6, 1.5, 0],      // West Hallway
    [-6, 1.5, -8],     // Near Ward 4 entrance
    [-6, 1.5, 6],      // Near Showers
    [0, 1.5, 0],       // Central Junction
    [6, 1.5, 0],       // East Hallway
    [16, 1.5, -8],     // Treatment room corridor
    [6, 1.5, 8],       // Towards Morgue corridor
    [0, 1.5, 15],      // Exit corridor
  ];

  return {
    spawnPosition,
    spawnRotationY,
    walls,
    lockers,
    doors,
    items,
    lights,
    patrolWaypoints
  };
}
