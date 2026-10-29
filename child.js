import * as THREE from 'three';

// Maniquí paramétrico: todas las medidas están en cm y se convierten a metros.
// Pies en y=0, el niño mira hacia +z. Los valores por defecto son las medidas de tu hermano.
export const MEASURES = [
  { group: 'Pose · ángulos en grados (ajusta mirando la silueta)' },
  { id: 'armAngle', label: 'Separación del brazo', unit: '°', def: 10, min: 0, max: 60, hint: '0 = brazo pegado al cuerpo; más = brazo abierto hacia afuera.' },
  { id: 'foreAngle', label: 'Inclinación del antebrazo', unit: '°', def: -8, min: -40, max: 40, hint: 'Respecto al brazo. Negativo = el antebrazo vuelve hacia el cuerpo.' },
  { id: 'legAngle', label: 'Separación de piernas', unit: '°', def: 6, min: 0, max: 25, hint: '0 = piernas rectas y juntas; más = piernas abiertas.' },
  { group: 'Alturas · de pie, descalzo, desde el suelo' },
  { id: 'height', label: 'Estatura', def: 148, min: 100, max: 185, hint: 'Suelo → coronilla, de espaldas a una pared.' },
  { id: 'shoulderH', label: 'Altura de hombro', def: 123, min: 80, max: 150, hint: 'Suelo → punta del hombro (el hueso que sobresale).' },
  { id: 'chestH', label: 'Altura de pecho', def: 114, min: 70, max: 135, hint: 'Suelo → axilas (donde pasa la cinta del pecho).' },
  { id: 'waistH', label: 'Altura de cintura', def: 90, min: 55, max: 115, hint: 'Suelo → cintura natural (lo más angosto del tronco, sobre el ombligo).' },
  { id: 'crotchH', label: 'Altura de entrepierna', def: 68, min: 40, max: 95, hint: 'Suelo → entrepierna (un libro entre las piernas, borde superior).' },
  { id: 'kneeH', label: 'Altura de rodilla', def: 44, min: 20, max: 55, hint: 'Suelo → mitad de la rótula.' },
  { group: 'Cabeza y cuello' },
  { id: 'headH', label: 'Alto de cabeza', def: 21, min: 16, max: 26, hint: 'Barbilla → coronilla, de perfil.' },
  { id: 'neck', label: 'Contorno de cuello', def: 28, min: 22, max: 38, hint: 'Cinta alrededor de la base del cuello, como un cuello de camisa.' },
  { group: 'Tronco · cinta horizontal, sin apretar' },
  { id: 'shoulderW', label: 'Ancho de hombros', def: 38, min: 24, max: 55, hint: 'Punta de un hombro → punta del otro, por la espalda.' },
  { id: 'chestC', label: 'Contorno de pecho', def: 88, min: 48, max: 95, hint: 'Alrededor del pecho a nivel de las axilas, brazos abajo.' },
  { id: 'waistC', label: 'Contorno de cintura', def: 78, min: 44, max: 85, hint: 'Alrededor de la cintura natural.' },
  { id: 'hipC', label: 'Contorno de cadera', def: 83, min: 50, max: 100, hint: 'Alrededor de la parte más ancha de los glúteos.' },
  { group: 'Brazos' },
  { id: 'armL', label: 'Largo de brazo', def: 26, min: 18, max: 38, hint: 'Punta del hombro → hueso del codo.' },
  { id: 'forearmL', label: 'Largo de antebrazo', def: 24, min: 15, max: 30, hint: 'Hueso del codo → hueso de la muñeca.' },
  { id: 'bicepC', label: 'Contorno de bíceps', def: 25, min: 14, max: 32, hint: 'Parte más gruesa del brazo, relajado.' },
  { id: 'forearmC', label: 'Contorno de antebrazo', def: 23, min: 13, max: 28, hint: 'Parte más gruesa, cerca del codo.' },
  { id: 'wristC', label: 'Contorno de muñeca', def: 16, min: 10, max: 20, hint: 'Justo sobre el hueso de la muñeca.' },
  { group: 'Piernas y pies' },
  { id: 'thighC', label: 'Contorno de muslo', def: 43, min: 28, max: 60, hint: 'Parte más gruesa, justo debajo del glúteo.' },
  { id: 'calfC', label: 'Contorno de pantorrilla', def: 33, min: 20, max: 42, hint: 'Parte más gruesa de la pantorrilla.' },
  { id: 'footL', label: 'Largo de pie', def: 21, min: 15, max: 29, hint: 'Talón → punta del dedo más largo.' }
];
export const DEFAULTS = Object.fromEntries(MEASURES.filter(m => m.id).map(m => [m.id, m.def]));

export const childMaterial = new THREE.MeshStandardMaterial({
  color: 0x7fa8c9, roughness: 0.8, flatShading: true,
  transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false
});
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x0d2433, transparent: true, opacity: 0.55 });

// Semieje mayor de una elipse con perímetro P y relación r = semieje menor / mayor (aprox. de Ramanujan).
const ellipseA = (P, r) => P / (Math.PI * (3 * (1 + r) - Math.sqrt((3 + r) * (1 + 3 * r))));

// Sólido por secciones elípticas {y, rx, rz}, con tapas arriba y abajo.
function loft(sections, seg = 12) {
  const pos = [], idx = [];
  for (const s of sections) for (let j = 0; j < seg; j++) {
    const t = j / seg * Math.PI * 2;
    pos.push(Math.cos(t) * s.rx, s.y, Math.sin(t) * s.rz);
  }
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, c, b, b, c, d);
  }
  const last = (sections.length - 1) * seg;
  pos.push(0, sections[0].y, 0, 0, sections[sections.length - 1].y, 0);
  const bottom = sections.length * seg, top = bottom + 1;
  for (let j = 0; j < seg; j++) {
    const k = (j + 1) % seg;
    idx.push(bottom, j, k, top, last + k, last + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Reconstruye el maniquí dentro de `group` a partir de las medidas (cm).
export function buildChild(group, cm) {
  for (const c of group.children.slice()) {
    c.traverse(o => o.geometry && o.geometry.dispose());
    group.remove(c);
  }
  const m = {};
  for (const k in DEFAULTS) m[k] = (Number.isFinite(+cm[k]) ? +cm[k] : DEFAULTS[k]) / 100;
  const rad = k => THREE.MathUtils.degToRad(m[k] * 100);  // los ángulos se guardan en grados
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const Y = V(0, 1, 0);

  function add(geometry, name, place) {
    const mesh = new THREE.Mesh(geometry, childMaterial);
    mesh.name = name;
    place(mesh);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 1), edgeMaterial));
    group.add(mesh);
    return mesh;
  }
  function limb(name, a, b, rA, rB, sides = 8) {
    const dir = new THREE.Vector3().subVectors(b, a);
    add(new THREE.CylinderGeometry(rB, rA, dir.length(), sides, 1), name, o => {
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(Y, dir.normalize());
    });
  }
  const joint = (name, p, r) => add(new THREE.IcosahedronGeometry(r, 1), name, o => o.position.copy(p));

  // Alturas coherentes: cada nivel queda al menos 4 cm bajo el anterior.
  const chin = m.height - m.headH + 0.01;
  const shoulderY = Math.min(m.shoulderH, chin - 0.01);
  const chestY = Math.min(m.chestH, shoulderY - 0.04);
  const waistY = Math.min(m.waistH, chestY - 0.04);
  const crotchY = Math.min(m.crotchH, waistY - 0.04);
  const hipY = Math.min(crotchY + 0.05, waistY - 0.01);

  const hipA = ellipseA(m.hipC, 0.72), hipB = hipA * 0.72;
  const waistA = ellipseA(m.waistC, 0.74), waistB = waistA * 0.74;
  const chestA = ellipseA(m.chestC, 0.62), chestB = chestA * 0.62;

  add(loft([
    { y: crotchY, rx: hipA * 0.85, rz: hipB * 0.9 },
    { y: hipY, rx: hipA, rz: hipB },
    { y: waistY, rx: waistA, rz: waistB },
    { y: chestY, rx: chestA, rz: chestB },
    { y: shoulderY - 0.02, rx: Math.max(chestA, m.shoulderW / 2 - 0.012), rz: chestB * 0.9 },
    { y: shoulderY + 0.005, rx: 0.06, rz: 0.045 }
  ]), 'torso', () => {});

  const neckR = m.neck / (2 * Math.PI);
  limb('cuello', V(0, shoulderY - 0.01), V(0, chin), neckR, neckR);
  add(new THREE.SphereGeometry(1, 12, 10), 'cabeza', o => {
    o.position.set(0, m.height - m.headH / 2, 0.005);
    o.scale.set(m.headH * 0.367, m.headH / 2, m.headH * 0.44);
  });

  const thighR = m.thighC / (2 * Math.PI), calfR = m.calfC / (2 * Math.PI);
  const a1 = rad('armAngle'), a2 = a1 + rad('foreAngle');
  const upperDir = V(Math.sin(a1), -Math.cos(a1), 0), foreDir = V(Math.sin(a2), -Math.cos(a2), 0.06).normalize();
  const legTan = Math.tan(rad('legAngle'));
  const bicepR = m.bicepC / (2 * Math.PI), foreR = m.forearmC / (2 * Math.PI), wristR = m.wristC / (2 * Math.PI);
  const hipX = hipA * 0.5;

  for (const s of [-1, 1]) {
    const side = s < 0 ? 'izq' : 'der';
    const hipY0 = crotchY + 0.04;
    const hip = V(s * hipX, hipY0), knee = V(s * (hipX + (hipY0 - m.kneeH) * legTan), m.kneeH, 0.01), ankle = V(s * (hipX + (hipY0 - 0.085) * legTan), 0.085);
    limb(`muslo_${side}`, hip, knee, thighR, calfR * 1.05);
    joint(`rodilla_${side}`, knee, calfR * 1.05);
    limb(`pantorrilla_${side}`, knee, ankle, calfR * 1.05, 0.03);
    add(new THREE.BoxGeometry(0.08, 0.07, m.footL), `pie_${side}`, o => o.position.set(ankle.x, 0.035, m.footL / 2 - 0.06));

    const shoulder = V(s * m.shoulderW / 2, shoulderY - 0.03);
    const dU = upperDir.clone(); dU.x *= s;
    const dF = foreDir.clone(); dF.x *= s;
    const elbow = shoulder.clone().addScaledVector(dU, m.armL);
    const wrist = elbow.clone().addScaledVector(dF, m.forearmL);
    joint(`hombro_${side}`, shoulder, bicepR * 1.1);
    limb(`brazo_${side}`, shoulder, elbow, bicepR, foreR * 1.05);
    joint(`codo_${side}`, elbow, foreR * 1.05);
    limb(`antebrazo_${side}`, elbow, wrist, foreR, wristR);
    add(new THREE.BoxGeometry(0.035, 0.13, 0.06), `mano_${side}`, o => {
      o.position.copy(wrist).addScaledVector(dF, 0.065);
      o.quaternion.setFromUnitVectors(Y, dF);
    });
  }
}
