import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GameStatus, LockerObject, PickupItem } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import {
  generateHospitalMap,
  HospitalMapData,
  LightFixture,
} from './hospitalMap';
import {
  createHospitalWallTexture,
  createHospitalFloorTexture,
  createHospitalCeilingTexture,
  createLockerDoorTexture,
  createHospitalDoorTexture,
} from './textures';
import { Player } from './Player';
import { Monster } from './Monster';

export class GameEngine {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public camera: THREE.PerspectiveCamera;
  public player: Player;
  public monster: Monster;
  public mapData: HospitalMapData;

  public status: GameStatus = 'PLAYING';
  public isGeneratorActive = false;
  public inventory: PickupItem[] = [];
  public currentMessage = '';
  public messageTimer = 0;

  // Performance Quality Mode
  public graphicsQuality: 'high' | 'fast' = 'fast';

  // Active lights for animation
  private animatedLights: { fixture: LightFixture; light: THREE.PointLight; baseIntensity: number }[] = [];
  private emergencyBeaconLight: THREE.PointLight | null = null;
  private beaconAngle = 0;

  // Locker 3D object references
  private lockerMeshes: Map<string, THREE.Group> = new Map();
  // Item 3D meshes
  private itemMeshes: Map<string, THREE.Group> = new Map();
  // Door meshes
  private doorMeshes: Map<string, THREE.Group> = new Map();

  // Generator lever mesh
  private generatorMesh: THREE.Group | null = null;

  // Render loop control
  private isSoftwareGl = false;
  private animFrameId = 0;
  private lastTime = 0;
  private isDestroyed = false;

  // Callbacks to UI
  private onStateChange: (engine: GameEngine) => void;

  constructor(container: HTMLElement, onStateChange: (engine: GameEngine) => void) {
    this.onStateChange = onStateChange;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.graphicsQuality = isMobile || this.isSoftwareGl ? 'fast' : 'high';

    // 2. High-Performance Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.graphicsQuality === 'high',
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      precision: isMobile ? 'mediump' : 'highp',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Optimized pixel ratio: 1.0 in fast/mobile, max 1.5 in high
    const targetPixelRatio = this.graphicsQuality === 'fast' ? 1.0 : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(targetPixelRatio);

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Shadows: only enabled if high quality, and only player flashlight casts shadows
    this.renderer.shadowMap.enabled = this.graphicsQuality === 'high';
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Much faster than PCFSoft on mobile

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Horizon Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050709);
    this.scene.fog = new THREE.FogExp2(0x050709, 0.08);

    // 4. Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Ambient Low-level Fill
    const hemiLight = new THREE.HemisphereLight(0x1a2624, 0x090a0d, 0.45);
    this.scene.add(hemiLight);

    // 6. Generate Map Data
    this.mapData = generateHospitalMap();

    // 7. Player Setup
    this.player = new Player(this.mapData.spawnPosition, this.mapData.spawnRotationY);
    this.camera = this.player.camera;
    this.scene.add(this.player.flashlight);
    this.scene.add(this.player.flashlightTarget);

    // 8. Monster Setup
    const monsterStart = this.mapData.patrolWaypoints[0];
    this.monster = new Monster(this.mapData.patrolWaypoints, monsterStart);
    this.scene.add(this.monster.group);

    // 9. Build Hospital 3D Architecture with Merged Geometry (Single Draw Call!)
    this.buildHospitalGeometry();
    this.buildLockers();
    this.buildDoors();
    this.buildHospitalProps();
    this.buildPickupItems();
    this.buildLights();

    // 10. Start Render Loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animFrameId = requestAnimationFrame(this.tick);

    // Window resize handler
    window.addEventListener('resize', this.onResize);
  }

  public setGraphicsQuality(quality: 'high' | 'fast') {
    this.graphicsQuality = quality;
    const targetPixelRatio = quality === 'fast' ? 1.0 : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(targetPixelRatio);
    this.renderer.shadowMap.enabled = quality === 'high';
    this.player.flashlight.castShadow = quality === 'high';
    this.onStateChange(this);
  }

  private onResize = () => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // Heavy Optimization: Merge all walls into a single BufferGeometry (1 draw call!)
  private buildHospitalGeometry() {
    const wallTex = createHospitalWallTexture();
    const floorTex = createHospitalFloorTexture();
    const ceilingTex = createHospitalCeilingTexture();

    // Floor (52x52m)
    floorTex.repeat.set(16, 16);
    const floorGeo = new THREE.PlaneGeometry(54, 54);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.65,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Ceiling
    ceilingTex.repeat.set(16, 16);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ceilingMesh = new THREE.Mesh(floorGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = 3.5;
    this.scene.add(ceilingMesh);

    // Merged Walls Geometry
    const wallGeometries: THREE.BufferGeometry[] = [];
    for (const w of this.mapData.walls) {
      const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
      geo.translate(w.x, w.h / 2, w.z);
      wallGeometries.push(geo);
    }

    const mergedWallsGeo = mergeGeometries(wallGeometries);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    const mergedWallsMesh = new THREE.Mesh(mergedWallsGeo, wallMat);
    mergedWallsMesh.castShadow = this.graphicsQuality === 'high';
    mergedWallsMesh.receiveShadow = true;
    this.scene.add(mergedWallsMesh);
  }

  // Build 3D Lockers (closets where player can hide)
  private buildLockers() {
    const lockerDoorTex = createLockerDoorTexture();
    const lockerBodyMat = new THREE.MeshStandardMaterial({
      color: 0x242b26,
      roughness: 0.65,
      metalness: 0.35,
    });

    const doorMat = new THREE.MeshStandardMaterial({
      map: lockerDoorTex,
      roughness: 0.6,
      metalness: 0.4,
    });

    for (const locker of this.mapData.lockers) {
      const lockerGroup = new THREE.Group();
      lockerGroup.position.set(...locker.position);
      lockerGroup.rotation.y = locker.rotationY;

      // 1. Outer Frame / Cabinet Box (width 1.0, height 2.5, depth 0.9)
      const cabinetGeo = new THREE.BoxGeometry(1.0, 2.5, 0.9);
      const cabinet = new THREE.Mesh(cabinetGeo, lockerBodyMat);
      cabinet.castShadow = this.graphicsQuality === 'high';
      cabinet.receiveShadow = true;
      lockerGroup.add(cabinet);

      // 2. Door with louvers (facing Z+)
      const doorGeo = new THREE.PlaneGeometry(0.92, 2.4);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(0, 0, 0.46);
      doorMesh.castShadow = false;
      lockerGroup.add(doorMesh);

      // 3. Top metal canopy & bevel
      const topTrimGeo = new THREE.BoxGeometry(1.06, 0.1, 0.96);
      const topTrim = new THREE.Mesh(topTrimGeo, lockerBodyMat);
      topTrim.position.set(0, 1.28, 0);
      lockerGroup.add(topTrim);

      // 4. Contact shadow
      const contactGeo = new THREE.PlaneGeometry(1.2, 1.1);
      const contactMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const contact = new THREE.Mesh(contactGeo, contactMat);
      contact.rotation.x = -Math.PI / 2;
      contact.position.y = -1.23;
      lockerGroup.add(contact);

      this.scene.add(lockerGroup);
      this.lockerMeshes.set(locker.id, lockerGroup);
    }
  }

  // Build Doors with interactive labels
  private buildDoors() {
    for (const door of this.mapData.doors) {
      const doorGroup = new THREE.Group();
      doorGroup.position.set(...door.position);
      doorGroup.rotation.y = door.rotationY;

      const doorTex = createHospitalDoorTexture(
        door.name,
        door.isLocked ? 'ЗАБЛОКИРОВАНО' : ''
      );
      const doorMat = new THREE.MeshStandardMaterial({
        map: doorTex,
        roughness: 0.55,
        metalness: 0.4,
      });

      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.12), doorMat);
      doorMesh.position.y = 0;
      doorMesh.castShadow = false;
      doorGroup.add(doorMesh);

      // Door Frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.7, metalness: 0.6 });
      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.9, 0.22), frameMat);
      leftFrame.position.set(-0.96, 0, 0);
      doorGroup.add(leftFrame);
      const rightFrame = leftFrame.clone();
      rightFrame.position.set(0.96, 0, 0);
      doorGroup.add(rightFrame);

      this.scene.add(doorGroup);
      this.doorMeshes.set(door.id, doorGroup);
    }
  }

  // Hospital Props: Gurneys, Wheelchairs, Medical carts, IV stands, Generator
  private buildHospitalProps() {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.8 });
    const rustMetalMat = new THREE.MeshStandardMaterial({ color: 0x47382d, roughness: 0.65, metalness: 0.5 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });

    // Hospital Gurneys
    const bedPositions: [number, number, number, number][] = [
      [-16, 0.45, -20, 0],
      [-10, 0.45, -20, 0],
      [-16, 0.45, -2, Math.PI / 4],
      [17, 0.45, -16, -Math.PI / 2],
      [15, 0.45, 12, 0],
      [20, 0.45, 12, 0],
    ];

    for (const [bx, by, bz, bRot] of bedPositions) {
      const bed = new THREE.Group();
      bed.position.set(bx, by, bz);
      bed.rotation.y = bRot;

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.4), bedMat);
      mattress.position.y = 0.4;
      bed.add(mattress);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 2.45), metalMat);
      frame.position.y = 0.25;
      bed.add(frame);

      [[-0.55, -1.1], [0.55, -1.1], [-0.55, 1.1], [0.55, 1.1]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), metalMat);
        leg.position.set(lx, 0, lz);
        bed.add(leg);
      });

      const headRail = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.5, 0.06), metalMat);
      headRail.position.set(0, 0.6, -1.18);
      bed.add(headRail);

      this.scene.add(bed);
    }

    // Overturned Wheelchair in Central Hall
    const wheelchair = new THREE.Group();
    wheelchair.position.set(-2, 0.4, 2);
    wheelchair.rotation.set(0.4, 0.8, 1.2);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.65), bedMat);
    wheelchair.add(seat);
    const wheel1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 5, 12), metalMat);
    wheel1.position.set(-0.35, 0, 0);
    wheel1.rotation.y = Math.PI / 2;
    wheelchair.add(wheel1);
    const wheel2 = wheel1.clone();
    wheel2.position.set(0.35, 0, 0);
    wheelchair.add(wheel2);
    this.scene.add(wheelchair);

    // IV Drip Stands
    const ivPositions: [number, number, number][] = [
      [-17.5, 1.0, -19],
      [18.5, 1.0, -15],
    ];
    for (const [ix, iy, iz] of ivPositions) {
      const iv = new THREE.Group();
      iv.position.set(ix, iy, iz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 5), metalMat);
      iv.add(pole);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.06), new THREE.MeshStandardMaterial({
        color: 0xef4444,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8,
      }));
      bag.position.set(0.12, 0.85, 0);
      iv.add(bag);
      this.scene.add(iv);
    }

    // Auxiliary Power Generator in Morgue Vault
    this.generatorMesh = new THREE.Group();
    this.generatorMesh.position.set(22, 1.0, 14);

    const genBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.2), rustMetalMat);
    this.generatorMesh.add(genBox);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6), metalMat);
    pipe.position.set(0, 1.0, 0);
    pipe.rotation.z = Math.PI / 2;
    this.generatorMesh.add(pipe);

    const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.1), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    leverBase.position.set(-0.82, 0.2, 0);
    this.generatorMesh.add(leverBase);

    const leverHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), new THREE.MeshStandardMaterial({ color: 0xb91c1c }));
    leverHandle.position.set(-0.86, 0.3, 0);
    leverHandle.rotation.z = 0.4;
    this.generatorMesh.add(leverHandle);

    this.scene.add(this.generatorMesh);
  }

  // Optimized Items: Use emissive materials instead of expensive point lights!
  private buildPickupItems() {
    for (const item of this.mapData.items) {
      const itemGroup = new THREE.Group();
      itemGroup.position.set(...item.position);

      if (item.type === 'battery') {
        const battMat = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          emissive: 0x553e05, // Glows naturally without light passes
          roughness: 0.3,
          metalness: 0.7,
        });
        const battMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), battMat);
        battMesh.rotation.z = Math.PI / 2;
        itemGroup.add(battMesh);

        const termMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.04, 6),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 })
        );
        termMesh.position.set(0.13, 0, 0);
        termMesh.rotation.z = Math.PI / 2;
        itemGroup.add(termMesh);
      } else if (item.type === 'key') {
        const keyMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0x4a2a00,
          roughness: 0.25,
          metalness: 0.9,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 5, 10), keyMat);
        ring.rotation.x = Math.PI / 2;
        itemGroup.add(ring);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 5), keyMat);
        shaft.position.set(0, 0, 0.14);
        shaft.rotation.x = Math.PI / 2;
        itemGroup.add(shaft);
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.08), keyMat);
        bit.position.set(0.04, 0, 0.22);
        itemGroup.add(bit);
      } else if (item.type === 'adrenaline') {
        const syringeMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x222222,
          roughness: 0.1,
          transparent: true,
          opacity: 0.7,
        });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 6), syringeMat);
        barrel.rotation.z = Math.PI / 2;
        itemGroup.add(barrel);
        const redLiquid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 0.16, 6),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x550a0a })
        );
        redLiquid.rotation.z = Math.PI / 2;
        itemGroup.add(redLiquid);
      } else if (item.type === 'note') {
        const noteMat = new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: 0x333010,
          roughness: 0.9,
        });
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.32), noteMat);
        itemGroup.add(paper);
      }

      this.scene.add(itemGroup);
      this.itemMeshes.set(item.id, itemGroup);
    }
  }

  // Heavy Optimization: NEVER cast shadows on PointLights!
  private buildLights() {
    for (const fix of this.mapData.lights) {
      const light = new THREE.PointLight(fix.color, fix.intensity, fix.distance, 1.8);
      light.position.set(...fix.position);
      light.castShadow = false; // PointLight shadows disabled for 5x FPS boost
      this.scene.add(light);

      // Light fixture housing
      const fixtureMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.1, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
      );
      fixtureMesh.position.set(fix.position[0], 3.45, fix.position[2]);
      this.scene.add(fixtureMesh);

      // Glowing tube
      const tubeMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6),
        new THREE.MeshBasicMaterial({ color: fix.color })
      );
      tubeMesh.rotation.z = Math.PI / 2;
      tubeMesh.position.set(fix.position[0], 3.38, fix.position[2]);
      this.scene.add(tubeMesh);

      this.animatedLights.push({
        fixture: fix,
        light,
        baseIntensity: fix.intensity,
      });

      if (fix.type === 'emergency_red') {
        this.emergencyBeaconLight = light;
      }
    }
  }

  // Interactive Check
  public interact() {
    // 1. If player is in front of a locker, toggle locker
    if (this.player.nearestLocker || this.player.stats.isHiding) {
      this.player.toggleLocker();
      this.onStateChange(this);
      return;
    }

    // 2. Check for nearby pickup item (< 2.2m)
    const pPos = this.player.position;
    for (const item of this.mapData.items) {
      if (item.pickedUp) continue;
      const dx = pPos.x - item.position[0];
      const dz = pPos.z - item.position[2];
      if (dx * dx + dz * dz < 4.84) {
        this.pickupItem(item);
        return;
      }
    }

    // 3. Check for Generator Lever in Morgue (< 2.8m)
    if (this.generatorMesh) {
      const dx = pPos.x - this.generatorMesh.position.x;
      const dz = pPos.z - this.generatorMesh.position.z;
      if (dx * dx + dz * dz < 7.84) {
        this.activateGenerator();
        return;
      }
    }

    // 4. Check for Doors (< 2.5m)
    for (const door of this.mapData.doors) {
      const dx = pPos.x - door.position[0];
      const dz = pPos.z - door.position[2];
      if (dx * dx + dz * dz < 6.25) {
        this.tryOpenDoor(door);
        return;
      }
    }
  }

  private pickupItem(item: PickupItem) {
    item.pickedUp = true;
    const mesh = this.itemMeshes.get(item.id);
    if (mesh) {
      this.scene.remove(mesh);
    }

    soundManager.playItemPickup(item.type);

    if (item.type === 'battery') {
      this.player.useBattery();
      this.showMessage(`Подобрана: ${item.name} (+50% заряда)`);
    } else if (item.type === 'adrenaline') {
      this.player.useAdrenaline();
      this.showMessage('Подобран адреналин: выносливость восстановлена!');
    } else if (item.type === 'key') {
      this.inventory.push(item);
      this.showMessage(`Получен ключ: ${item.name}`);
    } else if (item.type === 'note' && item.itemData?.text) {
      this.showMessage(String(item.itemData.text), 7000);
    }

    this.onStateChange(this);
  }

  private activateGenerator() {
    if (this.isGeneratorActive) {
      this.showMessage('Генератор уже работает на полную мощность!');
      return;
    }

    this.isGeneratorActive = true;
    soundManager.playDoorUnlock();
    this.showMessage('ГЕНЕРАТОР ЗАПУЩЕН! Включено аварийное питание выхода. Гул привлек чудовище!', 5000);

    for (const al of this.animatedLights) {
      al.light.color.setHex(0xf87171);
      al.light.intensity = 2.5;
    }

    this.monster.state = 'INVESTIGATE';
    this.monster.targetPoint.set(22, 0, 14);

    this.onStateChange(this);
  }

  private tryOpenDoor(door: typeof this.mapData.doors[0]) {
    if (door.isOpen) return;

    if (door.id === 'door_main_exit') {
      if (!this.isGeneratorActive) {
        this.showMessage('Главный выход обесточен! Запустите резервный генератор в Морге.');
        return;
      }
      const hasExitCard = this.inventory.some((i) => i.id === 'keycard_master_exit');
      if (!hasExitCard) {
        this.showMessage('Требуется Мастер-карта от Главного Выхода (спрятана в Морге)!');
        return;
      }

      door.isOpen = true;
      door.isLocked = false;
      this.status = 'VICTORY';
      soundManager.playDoorUnlock();
      this.showMessage('ВЫ СБЕЖАЛИ ИЗ ПСИХБОЛЬНИЦЫ!');
      this.onStateChange(this);
      return;
    }

    if (door.isLocked) {
      const hasKey = this.inventory.some((i) => i.id === door.requiredKeyId);
      if (hasKey) {
        door.isLocked = false;
        door.isOpen = true;
        soundManager.playDoorUnlock();
        this.showMessage(`Дверь открыта: ${door.name}`);

        const mesh = this.doorMeshes.get(door.id);
        if (mesh) {
          mesh.rotation.y += Math.PI / 2.2;
        }
      } else {
        this.showMessage(`Заперто! Требуется: ${door.name}`);
      }
    } else {
      door.isOpen = true;
      const mesh = this.doorMeshes.get(door.id);
      if (mesh) {
        mesh.rotation.y += Math.PI / 2.2;
      }
      soundManager.playDoorUnlock();
    }

    this.onStateChange(this);
  }

  public showMessage(text: string, duration = 3500) {
    this.currentMessage = text;
    this.messageTimer = duration;
    this.onStateChange(this);
  }

  // Main Render & Physics Tick Loop (Ultra-Optimized)
  private tick() {
    if (this.isDestroyed) return;

    const now = performance.now();
    const delta = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.status === 'PLAYING') {
      // 1. Update Player (W goes forward, S goes back, zero GC)
      this.player.update(delta, this.mapData.walls, this.mapData.lockers);

      // 2. Update Monster AI & Procedural Animation (zero GC)
      const monsterEvent = this.monster.update(
        delta,
        this.player.position,
        this.player.stats.isHiding,
        this.player.stats.isHoldingBreath,
        this.player.stats.isSprinting,
        this.player.stats.isFlashlightOn,
        this.player.activeLockerPos
      );

      // 3. Jumpscare / Caught Check
      if (monsterEvent === 'ATTACK_LOCKER') {
        this.triggerGameOver('Чудовище услышало ваше дыхание и выломало дверь шкафа!');
      } else if (!this.player.stats.isHiding && this.monster.distanceToPlayer < 1.4) {
        this.triggerGameOver('Пациент Ноль настиг вас в темном коридоре!');
      }

      // 4. Fear & Sanity System
      let fearTarget = 10;
      if (this.monster.distanceToPlayer < 18) {
        fearTarget = 10 + (1 - this.monster.distanceToPlayer / 18) * 90;
      }
      if (this.monster.state === 'CHASE') fearTarget = 100;
      this.player.stats.fearLevel = THREE.MathUtils.damp(this.player.stats.fearLevel, fearTarget, 4, delta);
      soundManager.updateFear(this.player.stats.fearLevel);

      if (this.player.stats.fearLevel > 75) {
        this.player.stats.sanity = Math.max(0, this.player.stats.sanity - delta * 4);
      }

      // 5. Heavy Optimization: Light Distance Culling & Flickering
      const px = this.player.position.x;
      const pz = this.player.position.z;

      for (let i = 0; i < this.animatedLights.length; i++) {
        const al = this.animatedLights[i];
        const dx = px - al.fixture.position[0];
        const dz = pz - al.fixture.position[2];
        const distSq = dx * dx + dz * dz;

        // Cull lights farther than 24m (24^2 = 576)
        if (distSq > 576) {
          if (al.light.visible) al.light.visible = false;
          continue;
        }

        if (!al.light.visible) al.light.visible = true;

        if (al.fixture.isFlickering) {
          const noise = Math.random();
          al.light.intensity = noise > 0.88 ? al.baseIntensity * 0.1 : al.baseIntensity * (0.85 + Math.random() * 0.3);
        }
      }

      // Emergency rotating beacon
      if (this.emergencyBeaconLight && this.emergencyBeaconLight.visible) {
        this.beaconAngle += delta * 3;
        this.emergencyBeaconLight.intensity = 1.4 + Math.sin(this.beaconAngle) * 0.9;
      }

      // 6. Item Floating / Subtle Bobbing
      for (const [id, mesh] of this.itemMeshes.entries()) {
        const item = this.mapData.items.find((i) => i.id === id);
        if (item && !item.pickedUp) {
          mesh.position.y = item.position[1] + Math.sin(now * 0.003 + mesh.position.x) * 0.04;
          mesh.rotation.y += delta * 0.8;
        }
      }

      // 7. Message Timer
      if (this.messageTimer > 0) {
        this.messageTimer -= delta * 1000;
        if (this.messageTimer <= 0) {
          this.currentMessage = '';
          this.onStateChange(this);
        }
      }
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private triggerGameOver(reason: string) {
    this.status = 'GAMEOVER';
    soundManager.playSpottedStinger();
    this.showMessage(reason, 10000);
    this.onStateChange(this);
  }

  public restart() {
    this.status = 'PLAYING';
    this.isGeneratorActive = false;
    this.inventory = [];
    this.currentMessage = '';

    this.player.position.set(...this.mapData.spawnPosition);
    this.player.yaw = this.mapData.spawnRotationY;
    this.player.pitch = 0;
    this.player.stats.stamina = 100;
    this.player.stats.battery = 100;
    this.player.stats.sanity = 100;
    this.player.stats.fearLevel = 10;
    this.player.stats.isFlashlightOn = true;
    this.player.stats.isHiding = false;
    this.player.stats.currentLockerId = null;
    this.player.stats.isHoldingBreath = false;
    this.player.stats.breathRemaining = 100;

    this.monster.position.set(...this.mapData.patrolWaypoints[0]);
    this.monster.state = 'PATROL';
    this.monster.currentWaypointIndex = 0;

    for (const item of this.mapData.items) {
      item.pickedUp = false;
      const mesh = this.itemMeshes.get(item.id);
      if (mesh) {
        this.scene.add(mesh);
      }
    }

    this.onStateChange(this);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
