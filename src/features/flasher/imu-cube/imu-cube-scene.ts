// The IMU cube in 3D: a cube with one colour per face and the sensor's x, y and z axes, eased
// towards the latest orientation every frame. No React: ImuCube builds it once three.js loads.
import type * as Three from "three";
import { definePalette } from "@/lib/palette";
import type { Stage3d, StageOptions, ThreeModule } from "@/ui/stage3d/stage3d";
import { toon } from "@/ui/stage3d/toon";
import { sensorToScene, sensorVectorToScene, type Quaternion } from "./imu-protocol";

const SIZE = 1.6;
const AXIS = 1.55;
/** How fast the cube catches up with a new reading, per second (bigger is snappier). */
const FOLLOW = 30;

const colours = definePalette({
  xPlus: "--part-red",
  xMinus: "--part-pink",
  yPlus: "--part-green",
  yMinus: "--part-yellow",
  zPlus: "--part-sky",
  zMinus: "--part-blue",
  axis: "--model-ink",
});

export const imuCubeStage: Omit<StageOptions, "reduce"> = {
  target: { x: 0, y: 0.15, z: 0 },
  radius: 9,
  az: 0.55,
  el: 0.42,
  fov: 30,
  spin: false,
  zoom: [0.6, 1.5],
  dragOn: "canvas",
  ground: { w: 4.2, d: 4.2, y: -1.75 },
};

export interface ImuCubeScene {
  /** The orientation to ease towards, as a sensor-frame quaternion. */
  setTarget(sensor: Quaternion): void;
}

/** A thin rod with a cone tip from the cube's centre along `dir` (scene frame). */
function axisArrow(T: ThreeModule, material: Three.Material, dir: Three.Vector3): Three.Group {
  const arrow = new T.Group();
  const rod = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, AXIS, 12), material);
  rod.position.y = AXIS / 2;
  const tip = new T.Mesh(new T.ConeGeometry(0.11, 0.3, 16), material);
  tip.position.y = AXIS + 0.15;
  arrow.add(rod, tip);
  arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
  return arrow;
}

export function buildImuCubeScene(T: ThreeModule, S: Stage3d): ImuCubeScene {
  const c = colours();
  const body = new T.Group();
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z (scene). Scene y is sensor z; scene -z is sensor y.
  const cube = new T.Mesh(new T.BoxGeometry(SIZE, SIZE, SIZE), [
    toon(T, c.xPlus),
    toon(T, c.xMinus),
    toon(T, c.zPlus),
    toon(T, c.zMinus),
    toon(T, c.yMinus),
    toon(T, c.yPlus),
  ]);
  body.add(cube);

  const ink = toon(T, c.axis);
  const tips: Array<[string, Three.Vector3]> = [];
  for (const [name, v] of [["x", [1, 0, 0]], ["y", [0, 1, 0]], ["z", [0, 0, 1]]] as const) {
    const dir = new T.Vector3(...sensorVectorToScene(v));
    body.add(axisArrow(T, ink, dir));
    tips.push([name, dir.clone().multiplyScalar(AXIS + 0.55)]);
  }
  S.scene.add(body);

  // Axis names follow the turning tips; the sensor's axis letters are the same in every language.
  for (const [name, local] of tips) {
    const world = new T.Vector3();
    S.label(name, () => body.localToWorld(world.copy(local)));
  }

  const target = new T.Quaternion();
  S.onFrame((_t, dt) => {
    if (S.reduce) body.quaternion.copy(target);
    else body.quaternion.slerp(target, 1 - Math.exp(-FOLLOW * dt));
  });

  return {
    setTarget(sensor) {
      const q = sensorToScene(sensor);
      target.set(q.x, q.y, q.z, q.w).normalize();
    },
  };
}
