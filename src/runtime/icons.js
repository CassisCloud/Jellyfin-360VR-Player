export function createPlayIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const shape = new THREE.Shape();
  shape.moveTo(-0.025 * s, 0.035 * s);
  shape.lineTo(-0.025 * s, -0.035 * s);
  shape.lineTo(0.03 * s, 0);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(geo, mat));
  parent.add(group);
  return group;
}

export function createPauseIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const barW = 0.012 * s, barH = 0.06 * s, gap = 0.016 * s;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const lGeo = new THREE.PlaneGeometry(barW, barH);
  const rGeo = new THREE.PlaneGeometry(barW, barH);
  const lBar = new THREE.Mesh(lGeo, mat);
  lBar.position.x = -gap;
  const rBar = new THREE.Mesh(rGeo, mat);
  rBar.position.x = gap;
  group.add(lBar);
  group.add(rBar);
  parent.add(group);
  return group;
}

export function createSeekBackIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const t1 = new THREE.Shape();
  t1.moveTo(0.015 * s, 0.025 * s);
  t1.lineTo(0.015 * s, -0.025 * s);
  t1.lineTo(-0.015 * s, 0);
  t1.closePath();
  const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
  m1.position.x = -0.01 * s;
  group.add(m1);
  const t2 = new THREE.Shape();
  t2.moveTo(0.015 * s, 0.025 * s);
  t2.lineTo(0.015 * s, -0.025 * s);
  t2.lineTo(-0.015 * s, 0);
  t2.closePath();
  const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
  m2.position.x = 0.015 * s;
  group.add(m2);
  parent.add(group);
  return group;
}

export function createSeekFwdIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const t1 = new THREE.Shape();
  t1.moveTo(-0.015 * s, 0.025 * s);
  t1.lineTo(-0.015 * s, -0.025 * s);
  t1.lineTo(0.015 * s, 0);
  t1.closePath();
  const m1 = new THREE.Mesh(new THREE.ShapeGeometry(t1), mat);
  m1.position.x = -0.015 * s;
  group.add(m1);
  const t2 = new THREE.Shape();
  t2.moveTo(-0.015 * s, 0.025 * s);
  t2.lineTo(-0.015 * s, -0.025 * s);
  t2.lineTo(0.015 * s, 0);
  t2.closePath();
  const m2 = new THREE.Mesh(new THREE.ShapeGeometry(t2), mat);
  m2.position.x = 0.01 * s;
  group.add(m2);
  parent.add(group);
  return group;
}

export function createSpeakerIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const body = new THREE.PlaneGeometry(0.014 * s, 0.022 * s);
  const bm = new THREE.Mesh(body, mat);
  bm.position.x = -0.016 * s;
  group.add(bm);
  const cone = new THREE.Shape();
  cone.moveTo(-0.008 * s, 0.015 * s);
  cone.lineTo(-0.008 * s, -0.015 * s);
  cone.lineTo(0.012 * s, -0.028 * s);
  cone.lineTo(0.012 * s, 0.028 * s);
  cone.closePath();
  group.add(new THREE.Mesh(new THREE.ShapeGeometry(cone), mat));
  parent.add(group);
  return group;
}

export function createSunIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const circle = new THREE.CircleGeometry(0.012 * s, 24);
  group.add(new THREE.Mesh(circle, mat));
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ray = new THREE.PlaneGeometry(0.004 * s, 0.012 * s);
    const rm = new THREE.Mesh(ray, mat);
    rm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
    rm.rotation.z = angle;
    group.add(rm);
  }
  parent.add(group);
  return group;
}

export function createGearIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const inner = new THREE.CircleGeometry(0.015 * s, 24);
  group.add(new THREE.Mesh(inner, mat));
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tooth = new THREE.PlaneGeometry(0.01 * s, 0.008 * s);
    const tm = new THREE.Mesh(tooth, mat);
    tm.position.set(Math.cos(angle) * 0.022 * s, Math.sin(angle) * 0.022 * s, 0);
    tm.rotation.z = angle;
    group.add(tm);
  }
  const hole = new THREE.CircleGeometry(0.007 * s, 24);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
  const hm = new THREE.Mesh(hole, holeMat);
  hm.position.z = 0.001;
  group.add(hm);
  parent.add(group);
  return group;
}

export function createCloseIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const bar1 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
  const m1 = new THREE.Mesh(bar1, mat);
  m1.rotation.z = Math.PI / 4;
  group.add(m1);
  const bar2 = new THREE.PlaneGeometry(0.05 * s, 0.008 * s);
  const m2 = new THREE.Mesh(bar2, mat);
  m2.rotation.z = -Math.PI / 4;
  group.add(m2);
  parent.add(group);
  return group;
}

export function createCenterIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.014 * s, 0.028 * s, 32), ringMat);
  group.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006 * s, 20), ringMat);
  dot.position.z = 0.001;
  group.add(dot);
  parent.add(group);
  return group;
}

export function createLayoutIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const positions = [
    [-0.016, 0.012], [0.016, 0.012],
    [-0.016, -0.012], [0.016, -0.012]
  ];
  for (let i = 0; i < positions.length; i++) {
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(0.018 * s, 0.014 * s), mat);
    tile.position.set(positions[i][0] * s, positions[i][1] * s, 0.001);
    group.add(tile);
  }
  parent.add(group);
  return group;
}

export function createCurveStartIcon(THREE, parent, x, y) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.024), mat);
  frame.position.set(x, y, 0.01);
  parent.add(frame);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.016), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
  inner.position.set(x, y, 0.011);
  parent.add(inner);
}

export function createCurveEndIcon(THREE, parent, x, y) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
  const arc = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 20, 1, Math.PI * 0.15, Math.PI * 0.7), mat);
  arc.position.set(x, y, 0.01);
  arc.rotation.z = Math.PI;
  parent.add(arc);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.004), mat);
  base.position.set(x, y - 0.016, 0.01);
  parent.add(base);
}

export function createNearIcon(THREE, parent, x, y) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
  const box = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.018), mat);
  box.position.set(x, y, 0.01);
  parent.add(box);
}

export function createFarIcon(THREE, parent, x, y) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.032), mat);
  outer.position.set(x, y, 0.01);
  parent.add(outer);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.02), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
  inner.position.set(x, y, 0.011);
  parent.add(inner);
}

export function createMoonIcon(THREE, parent, x, y, scale, color) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.015 * scale, 24), mat);
  moon.position.set(x, y, 0.01);
  parent.add(moon);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.012 * scale, 24), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
  cut.position.set(x + 0.006 * scale, y + 0.002 * scale, 0.011);
  parent.add(cut);
}

export function createBillboardIcon(THREE, parent, x, y, scale, color) {
  const group = new THREE.Group();
  group.position.set(x, y, 0.01);
  const s = scale;
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(0.048 * s, 0.03 * s), mat);
  group.add(frame);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.036 * s, 0.018 * s), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
  inner.position.z = 0.001;
  group.add(inner);
  const viewer = new THREE.Mesh(new THREE.CircleGeometry(0.008 * s, 20), mat);
  viewer.position.set(0, -0.028 * s, 0.001);
  group.add(viewer);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.004 * s, 0.018 * s), mat);
  line.position.set(0, -0.013 * s, 0.001);
  group.add(line);
  parent.add(group);
  return group;
}
