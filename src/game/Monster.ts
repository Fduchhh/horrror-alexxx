import * as THREE from 'three';
import { EnemyAIState } from '../types/game';
import { soundManager } from '../audio/SoundManager';
import { createMonsterFleshTexture } from './textures';

const _toPlayer = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _normalized = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

export class Monster {
  public group: THREE.Group;
  public state: EnemyAIState = 'PATROL';
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public targetPoint: THREE.Vector3 = new THREE.Vector3();
  public currentWaypointIndex = 0;
  public waypoints: [number, number, number][] = [];

  // Speeds
  public patrolSpeed = 1.35;
  public chaseSpeed = 3.6;
  public currentSpeed = 1.35;

  // Timers & AI logic
  private stateTimer = 0;
  private investigatePoint: THREE.Vector3 = new THREE.Vector3();
  private footstepTimer = 0;
  private animTimer = 0;

  // 3D Model Body Parts for Procedural Kinematics
  private torso: THREE.Mesh;
  private head: THREE.Group;
  private eyeLeft: THREE.Mesh;
  private eyeRight: THREE.Mesh;
  private armLeft: THREE.Group;
  private armRight: THREE.Group;
  private legLeft: THREE.Group;
  private legRight: THREE.Group;
  private shackleChain: THREE.Mesh;
  private weaponCleaver: THREE.Mesh;

  // Suspicion / alert meter
  public alertLevel = 0; // 0 to 100
  public isPlayerInSight = false;
  public distanceToPlayer = 999;
  public targetLockerId: string | null = null;
  public lockerSearchTimer = 0;

  constructor(waypoints: [number, number, number][], startPos: [number, number, number]) {
    this.waypoints = waypoints;
    this.position = new THREE.Vector3(...startPos);
    this.targetPoint.copy(this.position);

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    // Procedural Flesh & Blood Texture
    const fleshTex = createMonsterFleshTexture();

    // 1. Materials with physical roughness/metalness variation
    const bodyMat = new THREE.MeshStandardMaterial({
      map: fleshTex,
      roughness: 0.85,
      metalness: 0.1,
      color: 0x9fa89f
    });

    const bandageMat = new THREE.MeshStandardMaterial({
      color: 0x7c7569,
      roughness: 0.95,
      metalness: 0.05
    });

    const ironRustyMat = new THREE.MeshStandardMaterial({
      color: 0x3d291e,
      roughness: 0.5,
      metalness: 0.75
    });

    const glowingEyeMat = new THREE.MeshBasicMaterial({
      color: 0xff1a1a
    });

    // --- 2. Assembling 3-12 Part Composite Procedural Model ---

    // A. Torso (Curved deformed spine & ribbed chest)
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.28, 1.05, 8);
    this.torso = new THREE.Mesh(torsoGeo, bodyMat);
    this.torso.position.y = 1.35;
    this.torso.rotation.x = 0.22; // hunched forward grotesque posture
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Bandage wraps across ribs
    const wrapGeo = new THREE.TorusGeometry(0.36, 0.04, 6, 12);
    const wrap1 = new THREE.Mesh(wrapGeo, bandageMat);
    wrap1.rotation.x = Math.PI / 2;
    wrap1.position.y = 0.15;
    this.torso.add(wrap1);
    const wrap2 = wrap1.clone();
    wrap2.position.y = -0.15;
    this.torso.add(wrap2);

    // B. Head (Twitching, deformed, with elongated jaw and sunken glowing eyes)
    this.head = new THREE.Group();
    this.head.position.set(0, 0.65, 0.18);

    const craniumGeo = new THREE.SphereGeometry(0.24, 10, 8);
    craniumGeo.scale(1, 1.25, 1.1);
    const cranium = new THREE.Mesh(craniumGeo, bodyMat);
    cranium.castShadow = true;
    this.head.add(cranium);

    // Deformed lower jaw
    const jawGeo = new THREE.BoxGeometry(0.2, 0.14, 0.26);
    const jaw = new THREE.Mesh(jawGeo, bodyMat);
    jaw.position.set(0, -0.2, 0.08);
    this.head.add(jaw);

    // Glowing Menacing Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 6, 6);
    this.eyeLeft = new THREE.Mesh(eyeGeo, glowingEyeMat);
    this.eyeLeft.position.set(-0.09, 0.06, 0.22);
    this.eyeRight = new THREE.Mesh(eyeGeo, glowingEyeMat);
    this.eyeRight.position.set(0.09, 0.06, 0.22);
    this.head.add(this.eyeLeft);
    this.head.add(this.eyeRight);

    // Eye glow light (illuminates hallway red when looking at player)
    const eyeLight = new THREE.PointLight(0xff0000, 1.2, 3.5);
    eyeLight.position.set(0, 0.06, 0.25);
    this.head.add(eyeLight);

    this.torso.add(this.head);

    // C. Left Arm (Long reach, deformed fingers)
    this.armLeft = new THREE.Group();
    this.armLeft.position.set(-0.42, 0.35, 0);
    const upperArmLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6), bodyMat);
    upperArmLeft.position.y = -0.3;
    upperArmLeft.rotation.z = 0.15;
    this.armLeft.add(upperArmLeft);

    const forearmLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.65, 6), bodyMat);
    forearmLeft.position.set(-0.05, -0.85, 0.1);
    forearmLeft.rotation.x = -0.3;
    this.armLeft.add(forearmLeft);
    this.group.add(this.armLeft);

    // D. Right Arm (Holding rusty surgical bone cleaver)
    this.armRight = new THREE.Group();
    this.armRight.position.set(0.42, 0.35, 0);
    const upperArmRight = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.6, 6), bodyMat);
    upperArmRight.position.y = -0.3;
    upperArmRight.rotation.z = -0.15;
    this.armRight.add(upperArmRight);

    const forearmRight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.65, 6), bodyMat);
    forearmRight.position.set(0.05, -0.85, 0.1);
    forearmRight.rotation.x = -0.3;
    this.armRight.add(forearmRight);

    // Weapon: Rusty Medical Bone Cleaver
    const bladeGeo = new THREE.BoxGeometry(0.04, 0.32, 0.18);
    this.weaponCleaver = new THREE.Mesh(bladeGeo, ironRustyMat);
    this.weaponCleaver.position.set(0.06, -1.15, 0.2);
    this.weaponCleaver.rotation.z = 0.2;
    this.armRight.add(this.weaponCleaver);

    this.group.add(this.armRight);

    // Iron Restraint Shackle & Chain dangling from wrist
    const shackleGeo = new THREE.TorusGeometry(0.09, 0.025, 6, 10);
    this.shackleChain = new THREE.Mesh(shackleGeo, ironRustyMat);
    this.shackleChain.position.set(-0.05, -0.9, 0.1);
    this.armLeft.add(this.shackleChain);

    // E. Left Leg (Limp dragging leg)
    this.legLeft = new THREE.Group();
    this.legLeft.position.set(-0.2, 0.85, 0);
    const thighLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.55, 6), bodyMat);
    thighLeft.position.y = -0.27;
    this.legLeft.add(thighLeft);
    const shinLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 6), bodyMat);
    shinLeft.position.y = -0.75;
    this.legLeft.add(shinLeft);
    this.group.add(this.legLeft);

    // F. Right Leg
    this.legRight = new THREE.Group();
    this.legRight.position.set(0.2, 0.85, 0);
    const thighRight = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.55, 6), bodyMat);
    thighRight.position.y = -0.27;
    this.legRight.add(thighRight);
    const shinRight = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 6), bodyMat);
    shinRight.position.y = -0.75;
    this.legRight.add(shinRight);
    this.group.add(this.legRight);

    // Grounding contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);
  }

  public update(
    delta: number,
    playerPosition: THREE.Vector3,
    isPlayerHiding: boolean,
    isPlayerHoldingBreath: boolean,
    isPlayerSprinting: boolean,
    isFlashlightOn: boolean,
    currentLockerPos: THREE.Vector3 | null
  ) {
    this.animTimer += delta * 4;
    this.stateTimer += delta;

    // Calculate distance and sight angle to player (zero GC)
    _toPlayer.subVectors(playerPosition, this.position);
    _toPlayer.y = 0;
    this.distanceToPlayer = _toPlayer.length();

    _forward.set(0, 0, 1).applyQuaternion(this.group.quaternion);
    _normalized.copy(_toPlayer).normalize();
    const angleToPlayer = _forward.angleTo(_normalized);

    // Field of view detection (can see player within 80 degrees cone if not hiding, or closer if light is shining)
    const canSeePlayer =
      !isPlayerHiding &&
      this.distanceToPlayer < (isFlashlightOn ? 18 : 10) &&
      (angleToPlayer < (isFlashlightOn ? Math.PI * 0.55 : Math.PI * 0.35) || this.distanceToPlayer < 2.5);

    this.isPlayerInSight = canSeePlayer;

    // Hearing check (player sprinting creates audible footsteps within 14 units)
    const canHearPlayer =
      !isPlayerHiding && isPlayerSprinting && this.distanceToPlayer < 14;

    // Sound updates for 3D spatial panning relative to player
    const relativeAngle = Math.atan2(_toPlayer.x, _toPlayer.z);
    soundManager.updateMonsterAudio(this.distanceToPlayer, relativeAngle, this.state);

    // Footstep audio loop
    this.footstepTimer += delta * (this.state === 'CHASE' ? 3.0 : 1.4);
    if (this.footstepTimer > 1.0) {
      this.footstepTimer = 0;
      soundManager.playMonsterStep(this.distanceToPlayer, relativeAngle);
    }

    // --- STATE MACHINE ---
    switch (this.state) {
      case 'PATROL':
        this.currentSpeed = this.patrolSpeed;

        // Check if player spotted or heard
        if (canSeePlayer) {
          this.state = 'CHASE';
          this.stateTimer = 0;
          soundManager.playSpottedStinger();
          break;
        } else if (canHearPlayer || (isFlashlightOn && this.distanceToPlayer < 12)) {
          this.state = 'INVESTIGATE';
          this.investigatePoint.copy(playerPosition);
          this.targetPoint.copy(playerPosition);
          this.stateTimer = 0;
          break;
        }

        // Navigate towards current patrol waypoint
        if (this.waypoints.length > 0) {
          const wp = this.waypoints[this.currentWaypointIndex];
          this.targetPoint.set(wp[0], 0, wp[2]);

          const distToWp = new THREE.Vector2(this.position.x - wp[0], this.position.z - wp[2]).length();
          if (distToWp < 1.2) {
            // Next waypoint
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          }
        }
        break;

      case 'INVESTIGATE':
        this.currentSpeed = this.patrolSpeed * 1.1;

        if (canSeePlayer) {
          this.state = 'CHASE';
          this.stateTimer = 0;
          soundManager.playSpottedStinger();
          break;
        }

        // If player just hid into a locker nearby
        if (isPlayerHiding && currentLockerPos && this.position.distanceTo(currentLockerPos) < 6) {
          this.state = 'SEARCH_LOCKER';
          this.targetPoint.copy(currentLockerPos);
          this.stateTimer = 0;
          this.lockerSearchTimer = 0;
          break;
        }

        // Move to suspicious point
        const distToInvestigate = new THREE.Vector2(
          this.position.x - this.targetPoint.x,
          this.position.z - this.targetPoint.z
        ).length();

        if (distToInvestigate < 1.5 || this.stateTimer > 7) {
          // Finished investigating, return to patrol
          this.state = 'PATROL';
          this.stateTimer = 0;
        }
        break;

      case 'CHASE':
        this.currentSpeed = this.chaseSpeed;

        if (isPlayerHiding && currentLockerPos) {
          // Player hid while being chased! If monster was very close (< 5m), it saw which locker!
          if (this.distanceToPlayer < 7) {
            this.state = 'SEARCH_LOCKER';
            this.targetPoint.copy(currentLockerPos);
            this.stateTimer = 0;
            this.lockerSearchTimer = 0;
            break;
          } else {
            // Lost sight, investigate locker area
            this.state = 'INVESTIGATE';
            this.targetPoint.copy(currentLockerPos);
            this.stateTimer = 0;
            break;
          }
        }

        // Keep updating chase target to player position
        this.targetPoint.copy(playerPosition);

        // If lost sight for too long (> 6s) and far away
        if (!canSeePlayer && this.distanceToPlayer > 18 && this.stateTimer > 6) {
          this.state = 'INVESTIGATE';
          this.stateTimer = 0;
        }
        break;

      case 'SEARCH_LOCKER':
        this.currentSpeed = this.patrolSpeed * 0.7;
        this.lockerSearchTimer += delta;

        if (currentLockerPos) {
          this.targetPoint.copy(currentLockerPos);

          const distToLocker = new THREE.Vector2(
            this.position.x - currentLockerPos.x,
            this.position.z - currentLockerPos.z
          ).length();

          if (distToLocker < 2.0) {
            // Monster is right outside the locker sniffing and inspecting!
            if (!isPlayerHoldingBreath && this.lockerSearchTimer > 2.5) {
              // Player failed to hold breath or breath ran out!
              // Caught in locker! Trigger jumpscare attack!
              this.state = 'CHASE';
              return 'ATTACK_LOCKER';
            }

            // If player held breath for ~5 seconds, monster gets confused and wanders away!
            if (this.lockerSearchTimer > 5.5) {
              this.state = 'PATROL';
              this.stateTimer = 0;
              // Choose next waypoint away
              this.currentWaypointIndex = (this.currentWaypointIndex + 2) % this.waypoints.length;
            }
          }
        } else {
          this.state = 'PATROL';
        }
        break;
    }

    // --- MOVEMENT TOWARDS TARGET POINT (zero GC) ---
    _moveDir.subVectors(this.targetPoint, this.position);
    _moveDir.y = 0;
    const moveDist = _moveDir.length();

    if (moveDist > 0.1) {
      _moveDir.normalize();
      this.position.addScaledVector(_moveDir, this.currentSpeed * delta);

      // Smooth rotation toward movement direction
      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
      const curAngle = this.group.rotation.y;
      this.group.rotation.y = THREE.MathUtils.damp(curAngle, targetAngle, 6, delta);
    }

    this.group.position.copy(this.position);

    // --- PROCEDURAL SKELETON KINEMATICS & ANIMATION ---
    const legPhase = this.animTimer * (this.state === 'CHASE' ? 2.5 : 1.2);
    // Asymmetric limp: left leg drags, right leg lunges
    this.legLeft.rotation.x = Math.sin(legPhase) * 0.45;
    this.legRight.rotation.x = -Math.sin(legPhase) * 0.35 + 0.1;

    // Body bobbing
    this.torso.position.y = 1.35 + Math.abs(Math.sin(legPhase)) * 0.08;

    // Arms swaying & weapon ready
    this.armLeft.rotation.x = -Math.sin(legPhase) * 0.5 - 0.2;
    this.armRight.rotation.x = Math.sin(legPhase) * 0.4 + (this.state === 'CHASE' ? 0.6 : 0.0);

    // Creepy erratic head twitching
    const twitch = Math.sin(this.animTimer * 9) > 0.85 ? (Math.random() - 0.5) * 0.4 : 0;
    this.head.rotation.y = twitch;
    this.head.rotation.z = twitch * 0.5;

    return null;
  }
}
