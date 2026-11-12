// The P4 drone: each on-board sensor flies one part of it, so a change on the board shows at once.
//   LPS22HB pressure  -> altitude (lift the board and the drone climbs)
//   MMC5603 magnetic  -> heading (turn the board or bring a magnet near)
//   VCNL4040 light    -> the sun; in the dark the headlights come on
//   VCNL4040 prox.    -> the radar cone under the drone turns red and the drone backs off
//   MAX17048 battery  -> four charge LEDs (amber and blinking when the gauge is not believable)
//   FHT40 climate     -> clouds thicken with humidity, motors glow with temperature
// No React: the viewer builds it once three.js loads and feeds it each sample.
import type * as Three from "three";
import { definePalette } from "@/lib/palette";
import type { Stage3d, StageOptions, ThreeModule } from "@/ui/stage3d/stage3d";
import { glowTexture, toon } from "@/ui/stage3d/toon";
import { shortestTurn, type DroneControls } from "./p4-insights";

export const p4Stage: Omit<StageOptions, "reduce"> = {
  target: { x: 0, y: 0.35, z: 0 },
  radius: 10,
  // Keep the compass ring and the clouds in view on a short phone canvas too.
  fitWidth: 7.5,
  az: 0.6,
  el: 0.38,
  fov: 32,
  spin: false,
  dragOn: "canvas",
  zoom: [0.65, 1.4],
  ground: { w: 5, d: 5, y: -1.9 },
};

const colours = definePalette({
  body: "--part-glass",
  arm: "--model-ink",
  shell: "--part-light",
  cool: "--part-sky",
  warm: "--part-orange",
  ok: "--part-green",
  low: "--part-red",
  amber: "--part-yellow",
  sun: "--part-yellow",
  cloud: "--part-light",
  ring: "--part-teal",
});

/** Scene units per metre of altitude; ±2 m fits the view. */
const LIFT = 0.55;
const GROUND = -1.9;
const LED_COUNT = 4;

export interface P4SceneText {
  /** The letter on the compass ring for the heading the drone starts at. */
  readonly north: string;
}

export interface P4Scene {
  setControls(controls: DroneControls): void;
}

export function buildP4Scene(T: ThreeModule, S: Stage3d, text: P4SceneText): P4Scene {
  const c = colours();
  const drone = new T.Group();

  // Frame: body, canopy, two crossed arms, motors, landing skids.
  const body = new T.Mesh(new T.BoxGeometry(1.0, 0.26, 1.0), toon(T, c.body));
  drone.add(body);
  const canopy = new T.Mesh(new T.SphereGeometry(0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(T, c.shell));
  canopy.position.y = 0.13;
  canopy.scale.set(1, 0.6, 1.2);
  drone.add(canopy);
  const armMaterial = toon(T, c.arm);
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const arm = new T.Mesh(new T.BoxGeometry(2.7, 0.08, 0.14), armMaterial);
    arm.rotation.y = angle;
    drone.add(arm);
  }
  const motorMaterial = toon(T, c.cool);
  const props: Three.Group[] = [];
  const corners = [[0.95, 0.95], [-0.95, 0.95], [-0.95, -0.95], [0.95, -0.95]] as const;
  corners.forEach(([x, z], index) => {
    const motor = new T.Mesh(new T.CylinderGeometry(0.17, 0.19, 0.24, 18), motorMaterial);
    motor.position.set(x, 0.08, z);
    drone.add(motor);
    const prop = new T.Group();
    prop.position.set(x, 0.24, z);
    for (const turn of [0, Math.PI / 2]) {
      const blade = new T.Mesh(new T.BoxGeometry(0.95, 0.02, 0.09), armMaterial);
      blade.rotation.y = turn;
      prop.add(blade);
    }
    const blur = new T.Mesh(
      new T.CircleGeometry(0.5, 32),
      new T.MeshBasicMaterial({ color: new T.Color(c.shell), transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide }),
    );
    blur.rotation.x = -Math.PI / 2;
    prop.add(blur);
    prop.userData.direction = index % 2 ? 1 : -1;
    props.push(prop);
    drone.add(prop);
  });
  for (const side of [-0.42, 0.42]) {
    const skid = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.2, 8), armMaterial);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side, -0.36, 0);
    drone.add(skid);
    for (const end of [-0.3, 0.3]) {
      const leg = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.24, 6), armMaterial);
      leg.position.set(side, -0.24, end);
      drone.add(leg);
    }
  }

  // MAX17048: four LEDs on the back.
  const ledMaterials: Three.MeshBasicMaterial[] = [];
  for (let i = 0; i < LED_COUNT; i++) {
    const material = new T.MeshBasicMaterial({ color: new T.Color(c.ok), transparent: true, opacity: 0.15 });
    const led = new T.Mesh(new T.BoxGeometry(0.13, 0.08, 0.04), material);
    led.position.set(-0.3 + i * 0.2, 0.02, -0.52);
    ledMaterials.push(material);
    drone.add(led);
  }

  // VCNL4040 light: headlights in front, beams only when it is dark.
  const beamMaterial = new T.MeshBasicMaterial({ color: new T.Color(c.amber), transparent: true, opacity: 0, depthWrite: false });
  const lampMaterial = new T.MeshBasicMaterial({ color: new T.Color(c.amber), transparent: true, opacity: 0.3 });
  for (const side of [-0.25, 0.25]) {
    const lamp = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), lampMaterial);
    lamp.position.set(side, 0, 0.52);
    drone.add(lamp);
    const beam = new T.Mesh(new T.ConeGeometry(0.45, 2.2, 20, 1, true), beamMaterial);
    beam.rotation.x = -Math.PI / 2 - 0.35;
    beam.position.set(side, -0.35, 1.55);
    drone.add(beam);
  }

  // VCNL4040 proximity: a radar cone below, green when clear, red when something is close.
  const radarMaterial = new T.MeshBasicMaterial({ color: new T.Color(c.ok), transparent: true, opacity: 0.12, depthWrite: false });
  const radar = new T.Mesh(new T.ConeGeometry(0.55, 1, 24, 1, true), radarMaterial);
  radar.position.y = -0.4;
  drone.add(radar);

  S.scene.add(drone);

  // Altitude line from the ground to the drone, and a compass ring on the ground.
  const tether = new T.Mesh(
    new T.CylinderGeometry(0.012, 0.012, 1, 6),
    new T.MeshBasicMaterial({ color: new T.Color(c.ring), transparent: true, opacity: 0.5 }),
  );
  S.scene.add(tether);
  const compass = new T.Mesh(
    new T.TorusGeometry(2.1, 0.02, 6, 96),
    new T.MeshBasicMaterial({ color: new T.Color(c.ring), transparent: true, opacity: 0.55 }),
  );
  compass.rotation.x = Math.PI / 2;
  compass.position.y = GROUND + 0.02;
  S.scene.add(compass);
  const northMark = new T.Mesh(new T.ConeGeometry(0.1, 0.3, 3), new T.MeshBasicMaterial({ color: new T.Color(c.low) }));
  northMark.rotation.x = Math.PI / 2;
  northMark.position.set(0, GROUND + 0.04, 2.1);
  S.scene.add(northMark);
  S.label(text.north, new T.Vector3(0, GROUND + 0.1, 2.45));

  // The sun: size and glow follow the light.
  const sun = new T.Group();
  sun.position.set(-2.6, 2.4, -2.2);
  const sunMaterial = new T.MeshBasicMaterial({ color: new T.Color(c.sun), transparent: true, opacity: 0.4 });
  sun.add(new T.Mesh(new T.SphereGeometry(0.32, 20, 14), sunMaterial));
  const glowMaterial = new T.SpriteMaterial({ map: glowTexture(T), color: new T.Color(c.sun), transparent: true, opacity: 0.2, depthWrite: false });
  const glow = new T.Sprite(glowMaterial);
  glow.scale.setScalar(1.6);
  sun.add(glow);
  S.scene.add(sun);

  // FHT40 humidity: clouds that thicken.
  const cloudMaterial = new T.MeshBasicMaterial({ color: new T.Color(c.cloud), transparent: true, opacity: 0, depthWrite: false });
  const clouds: Three.Group[] = [];
  for (const [x, y, z] of [[2.6, 2.0, -1.8], [-1.6, 2.3, -2.6], [-3.0, 1.0, -1.2]] as const) {
    const cloud = new T.Group();
    for (const [dx, dy, r] of [[0, 0, 0.42], [0.42, -0.05, 0.32], [-0.4, -0.06, 0.3], [0.15, 0.2, 0.3]] as const) {
      const puff = new T.Mesh(new T.SphereGeometry(r, 14, 10), cloudMaterial);
      puff.position.set(dx, dy, 0);
      cloud.add(puff);
    }
    cloud.position.set(x, y, z);
    clouds.push(cloud);
    S.scene.add(cloud);
  }

  const cool = new T.Color(c.cool);
  const warm = new T.Color(c.warm);
  const okColour = new T.Color(c.ok);
  const lowColour = new T.Color(c.low);
  const amberColour = new T.Color(c.amber);
  const target = { y: 0, heading: 0, back: 0, sun: 0.4, beams: 0, radar: 0.12, clouds: 0, motor: new T.Color(c.cool), radarColour: new T.Color(c.ok) };
  let battery: DroneControls["battery"] = null;
  let lastY = 0;
  let spin = 0;

  S.onFrame((t, dt) => {
    const ease = 1 - Math.exp(-5 * dt);
    const bob = S.reduce ? 0 : Math.sin(t * 2.1) * 0.05;
    drone.position.y += (target.y + bob - drone.position.y) * ease;
    drone.position.z += (-target.back - drone.position.z) * ease;
    drone.rotation.y += (shortestTurn(drone.rotation.y, target.heading) - drone.rotation.y) * ease;
    // Lean into a climb or a dodge, like a real quadcopter.
    const climb = (drone.position.y - lastY) / Math.max(dt, 1e-3);
    lastY = drone.position.y;
    drone.rotation.x += (-target.back * 0.25 - drone.rotation.x) * ease;
    if (!S.reduce) {
      spin += dt * (22 + Math.max(0, climb) * 30);
      props.forEach((prop) => { prop.rotation.y = spin * (prop.userData.direction === 1 ? 1 : -1); });
      clouds.forEach((cloud, index) => { cloud.position.x += Math.sin(t * 0.2 + index) * dt * 0.05; });
    }

    tether.scale.y = Math.max(0.01, drone.position.y - 0.4 - GROUND);
    tether.position.set(drone.position.x, GROUND + tether.scale.y / 2, drone.position.z);

    sunMaterial.opacity += (0.25 + target.sun * 0.75 - sunMaterial.opacity) * ease;
    glowMaterial.opacity += (target.sun * 0.9 - glowMaterial.opacity) * ease;
    glow.scale.setScalar(1 + target.sun * 2.4);
    beamMaterial.opacity += (target.beams * 0.28 - beamMaterial.opacity) * ease;
    lampMaterial.opacity += (0.3 + target.beams * 0.7 - lampMaterial.opacity) * ease;
    radarMaterial.opacity += (target.radar - radarMaterial.opacity) * ease;
    radarMaterial.color.lerp(target.radarColour, ease);
    cloudMaterial.opacity += (target.clouds - cloudMaterial.opacity) * ease;
    motorMaterial.color.lerp(target.motor, ease);

    // Battery LEDs: lit by charge; amber and blinking when the gauge's percentage is not believable.
    const blink = battery?.state === "overRange" && !S.reduce ? 0.55 + 0.45 * Math.sin(t * 5) : 1;
    ledMaterials.forEach((material, index) => {
      const lit = battery ? Math.min(1, Math.max(0, (battery.percent / 100) * LED_COUNT - index)) : 0;
      const colour = !battery ? okColour
        : battery.state === "overRange" ? amberColour
          : battery.state === "ok" ? okColour : lowColour;
      material.color.copy(colour);
      material.opacity = 0.15 + lit * 0.85 * blink;
    });
  });

  return {
    setControls(controls) {
      target.y = (controls.altitude ?? 0) * LIFT;
      if (controls.heading !== null) target.heading = (-controls.heading * Math.PI) / 180;
      const light = controls.light ?? 0.4;
      target.sun = light;
      target.beams = controls.light === null ? 0 : Math.max(0, 1 - light / 0.35);
      const near = controls.proximity ?? 0;
      target.back = near * 1.2;
      target.radar = controls.proximity === null ? 0.06 : 0.12 + near * 0.5;
      target.radarColour.copy(okColour).lerp(lowColour, near);
      target.clouds = controls.humidity === null ? 0 : 0.1 + controls.humidity * 0.75;
      target.motor.copy(cool).lerp(warm, controls.warmth ?? 0);
      battery = controls.battery;
    },
  };
}
