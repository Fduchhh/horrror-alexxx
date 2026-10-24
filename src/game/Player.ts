import * as THREE from 'three';
import { PlayerStats, LockerObject } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import { WallSegment } from './hospitalMap';

const _tempForward = new THREE.Vector3();
const _tempEuler = new THREE.Euler();

export class Player {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public stats: PlayerStats;

  // Rotation angles in radians
  public yaw = 0;
  public pitch = 0;

  // Flashlight spot light
  public flashlight: THREE.SpotLight;
  public flashlightTarget: THREE.Object3D;

  // Kinematic parameters
  public walkSpeed = 2.4;
  public sprintSpeed = 4.8;
  public crouchSpeed = 1.2;
  public normalEyeHeight = 1.6;
  public crouchEyeHeight = 0.9;
  public lockerEyeHeight = 1.4;

  // Bobbing & footsteps
  private bobTimer = 0;
  private footstepTimer = 0;

  // Movement input states
  public moveForward = false;
  public moveBackward = false;
  public moveLeft = false;
  public moveRight = false;
  public mobileMoveX = 0;
  public mobileMoveY = 0;

  // Nearby interactive object
  public nearestLocker: LockerObject | null = null;
  public activeLockerPos: THREE.Vector3 | null = null;

  constructor(startPos: [number, number, number], startYaw: number) {
    this.position = new THREE.Vector3(...startPos);
    this.yaw = startYaw;

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.copy(this.position);

    this.stats = {
      stamina: 100,
      battery: 100,
      sanity: 100,
      fearLevel: 10,
      isFlashlightOn: true,
      isCrouching: false,
      isSprinting: false,
      isHiding: false,
      currentLockerId: null,
      isHoldingBreath: false,
      breathRemaining: 100
    };

    // Realistic volumetric flashlight
    this.flashlight = new THREE.SpotLight(0xf8fafc, 2.8, 24, Math.PI / 6.5, 0.45, 1.2);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 24;

    this.flashlightTarget = new THREE.Object3D();
    this.flashlight.target = this.flashlightTarget;
  }

  public update(delta: number, walls: WallSegment[], lockers: LockerObject[]) {
    // 1. Stamina & Breath Management
    if (this.stats.isHiding) {
      // In locker
      if (this.stats.isHoldingBreath) {
        this.stats.breathRemaining = Math.max(0, this.stats.breathRemaining - delta * 18);
        if (this.stats.breathRemaining <= 0) {
          // Out of breath: gasps!
          this.stats.isHoldingBreath = false;
          soundManager.playHeavyBreath();
        }
      } else {
        this.stats.breathRemaining = Math.min(100, this.stats.breathRemaining + delta * 24);
      }
      this.stats.isSprinting = false;
      this.stats.stamina = Math.min(100, this.stats.stamina + delta * 15);
    } else {
      // Normal movement
      const isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight ||
        Math.abs(this.mobileMoveX) > 0.1 || Math.abs(this.mobileMoveY) > 0.1;

      if (this.stats.isSprinting && isMoving) {
        this.stats.stamina = Math.max(0, this.stats.stamina - delta * 22);
        if (this.stats.stamina <= 0) {
          this.stats.isSprinting = false;
          soundManager.playHeavyBreath();
        }
      } else {
        this.stats.stamina = Math.min(100, this.stats.stamina + delta * (isMoving ? 8 : 18));
      }
    }

    // 2. Battery Drain
    if (this.stats.isFlashlightOn) {
      this.stats.battery = Math.max(0, this.stats.battery - delta * 0.45);
      if (this.stats.battery <= 0) {
        this.stats.isFlashlightOn = false;
      }
    }

    // Flashlight flicker when battery is low (< 20%)
    if (this.stats.isFlashlightOn && this.stats.battery < 20) {
      const flicker = Math.random() > 0.82 ? 0.2 : 1.0;
      this.flashlight.intensity = 2.8 * (this.stats.battery / 20) * flicker;
    } else if (this.stats.isFlashlightOn) {
      this.flashlight.intensity = 2.8;
    } else {
      this.flashlight.intensity = 0;
    }

    // 3. Movement & Kinematics (if not hiding in locker)
    if (!this.stats.isHiding) {
      let speed = this.walkSpeed;
      if (this.stats.isCrouching) speed = this.crouchSpeed;
      else if (this.stats.isSprinting && this.stats.stamina > 5) speed = this.sprintSpeed;

      // Compute input vector
      let inputX = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) + this.mobileMoveX;
      let inputZ = (this.moveForward ? 1 : 0) - (this.moveBackward ? 1 : 0) - this.mobileMoveY;

      const inputLen = Math.hypot(inputX, inputZ);
      if (inputLen > 1) {
        inputX /= inputLen;
        inputZ /= inputLen;
      }

      // Camera Forward in world space: (-sin(yaw), 0, -cos(yaw))
      // Camera Right in world space: (cos(yaw), 0, -sin(yaw))
      // W (inputZ = 1) moves forward, S (inputZ = -1) moves backward
      const moveX = (inputX * Math.cos(this.yaw) - inputZ * Math.sin(this.yaw)) * speed * delta;
      const moveZ = (-inputX * Math.sin(this.yaw) - inputZ * Math.cos(this.yaw)) * speed * delta;

      // Wall Collision with AABB
      const playerRadius = 0.45;
      let targetX = this.position.x + moveX;
      let targetZ = this.position.z + moveZ;

      for (const w of walls) {
        const minX = w.x - w.w / 2 - playerRadius;
        const maxX = w.x + w.w / 2 + playerRadius;
        const minZ = w.z - w.d / 2 - playerRadius;
        const maxZ = w.z + w.d / 2 + playerRadius;

        // Check X collision
        if (targetX >= minX && targetX <= maxX && this.position.z >= minZ && this.position.z <= maxZ) {
          targetX = this.position.x;
        }
        // Check Z collision
        if (targetZ >= minZ && targetZ <= maxZ && this.position.x >= minX && this.position.x <= maxX) {
          targetZ = this.position.z;
        }
      }

      this.position.x = targetX;
      this.position.z = targetZ;

      // Head bobbing & footsteps
      const isMoving = Math.hypot(moveX, moveZ) > 0.001;
      if (isMoving) {
        const bobFrequency = this.stats.isSprinting ? 12 : this.stats.isCrouching ? 6 : 8.5;
        this.bobTimer += delta * bobFrequency;

        const footstepInterval = this.stats.isSprinting ? 0.32 : this.stats.isCrouching ? 0.65 : 0.48;
        this.footstepTimer += delta;
        if (this.footstepTimer >= footstepInterval) {
          this.footstepTimer = 0;
          soundManager.playFootstep(this.stats.isSprinting, this.stats.isCrouching);
        }
      } else {
        this.bobTimer = 0;
        this.footstepTimer = 0;
      }

      // Camera height
      const targetEyeHeight = this.stats.isCrouching ? this.crouchEyeHeight : this.normalEyeHeight;
      const bobOffset = isMoving ? Math.sin(this.bobTimer) * 0.05 : 0;
      this.position.y = THREE.MathUtils.damp(this.position.y, targetEyeHeight + bobOffset, 10, delta);
    } else {
      // Inside locker
      this.position.y = THREE.MathUtils.damp(this.position.y, this.lockerEyeHeight, 10, delta);
    }

    // 4. Update Camera Rotation & Position
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // 5. Update Flashlight to follow camera smoothly (zero GC)
    _tempForward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.flashlight.position.copy(this.camera.position).addScaledVector(_tempForward, 0.1);
    this.flashlightTarget.position.copy(this.flashlight.position).addScaledVector(_tempForward, 5);

    // 6. Check Nearest Locker for Interaction Prompt
    this.checkNearestLocker(lockers);
  }

  private checkNearestLocker(lockers: LockerObject[]) {
    if (this.stats.isHiding) {
      this.nearestLocker = null;
      return;
    }

    let closest: LockerObject | null = null;
    let minDist = 2.2;

    for (const l of lockers) {
      const dist = new THREE.Vector2(this.position.x - l.position[0], this.position.z - l.position[2]).length();
      if (dist < minDist) {
        minDist = dist;
        closest = l;
      }
    }

    this.nearestLocker = closest;
  }

  // --- ACTIONS ---
  public toggleFlashlight() {
    if (this.stats.battery <= 0) return;
    this.stats.isFlashlightOn = !this.stats.isFlashlightOn;
    soundManager.playFlashlightClick(this.stats.isFlashlightOn);
  }

  public toggleCrouch() {
    if (this.stats.isHiding) return;
    this.stats.isCrouching = !this.stats.isCrouching;
  }

  public setSprinting(state: boolean) {
    if (this.stats.isHiding) return;
    this.stats.isSprinting = state && this.stats.stamina > 10;
  }

  public toggleLocker() {
    if (this.stats.isHiding) {
      // Exit locker
      this.exitLocker();
    } else if (this.nearestLocker) {
      // Enter locker
      this.enterLocker(this.nearestLocker);
    }
  }

  public enterLocker(locker: LockerObject) {
    this.stats.isHiding = true;
    this.stats.currentLockerId = locker.id;
    this.activeLockerPos = new THREE.Vector3(...locker.position);

    // Turn off flashlight automatically when entering locker to stay hidden!
    if (this.stats.isFlashlightOn) {
      this.stats.isFlashlightOn = false;
      soundManager.playFlashlightClick(false);
    }

    // Move player inside locker
    this.position.set(locker.position[0], this.lockerEyeHeight, locker.position[2]);
    this.yaw = locker.rotationY + Math.PI; // Face outwards through louvers
    this.pitch = 0;

    soundManager.playLockerEnter();
  }

  public exitLocker() {
    if (!this.stats.isHiding || !this.activeLockerPos) return;

    this.stats.isHiding = false;
    this.stats.currentLockerId = null;

    // Step slightly forward outside of the locker
    _tempEuler.set(0, this.yaw, 0);
    _tempForward.set(0, 0, -1).applyEuler(_tempEuler);
    this.position.addScaledVector(_tempForward, 1.2);
    this.position.y = this.normalEyeHeight;
    this.activeLockerPos = null;

    soundManager.playLockerExit();
  }

  public useBattery() {
    if (this.stats.battery < 95) {
      this.stats.battery = Math.min(100, this.stats.battery + 50);
      soundManager.playItemPickup('battery');
      return true;
    }
    return false;
  }

  public useAdrenaline() {
    this.stats.stamina = 100;
    this.stats.fearLevel = Math.max(0, this.stats.fearLevel - 50);
    this.stats.sanity = Math.min(100, this.stats.sanity + 40);
    soundManager.playItemPickup('adrenaline');
    return true;
  }
}
