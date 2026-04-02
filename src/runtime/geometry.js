export function createRoundedRectGeometry(THREE, width, height, radius, _segments) {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  shape.moveTo(-w, -h + radius);
  shape.lineTo(-w, h - radius);
  shape.quadraticCurveTo(-w, h, -w + radius, h);
  shape.lineTo(w - radius, h);
  shape.quadraticCurveTo(w, h, w, h - radius);
  shape.lineTo(w, -h + radius);
  shape.quadraticCurveTo(w, -h, w - radius, -h);
  shape.lineTo(-w + radius, -h);
  shape.quadraticCurveTo(-w, -h, -w, -h + radius);
  return new THREE.ShapeGeometry(shape, _segments || 16);
}

export function createCurvedScreenGeometry(THREE, width, height, curveParams) {
  if (!curveParams.curved) {
    return new THREE.PlaneGeometry(width, height);
  }
  const geometry = new THREE.CylinderGeometry(
    curveParams.radius,
    curveParams.radius,
    height,
    96,
    1,
    true,
    Math.PI - (curveParams.theta / 2),
    curveParams.theta
  );
  geometry.scale(-1, 1, 1);
  geometry.translate(0, 0, curveParams.radius);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
