// Scène, ciel, lumières. Un seul réglage par ambiance.

import * as THREE from 'three';

export const AMBIANCES = {
  jour: {
    hautCiel: 0x4e86c4,
    basCiel: 0xbcd4e6,
    soleil: 0xfff3dd,
    ambiant: 0x7a8ca0,
    brouillard: 0xa9c2d6,
    distance: 400,
    azimut: 0.9,
    hauteur: 0.55,
    intensite: 1.75,
  },
};

export function creerScene(ambiance = AMBIANCES.jour) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(ambiance.brouillard, ambiance.distance * 0.22, ambiance.distance);

  const ciel = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        haut: { value: new THREE.Color(ambiance.hautCiel) },
        bas: { value: new THREE.Color(ambiance.basCiel) },
      },
      vertexShader: `varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 haut; uniform vec3 bas; varying float h;
        void main(){ gl_FragColor = vec4(mix(bas, haut, clamp(h*1.4+0.08,0.0,1.0)), 1.0); }`,
    }),
  );
  // Rayon tenu sous le plan lointain de la caméra, sinon la voûte est coupée.
  ciel.scale.setScalar(1);
  ciel.renderOrder = -1;
  ciel.frustumCulled = false;
  scene.add(ciel);
  scene.userData.ciel = ciel;

  const soleil = new THREE.DirectionalLight(ambiance.soleil, ambiance.intensite);
  const a = ambiance.azimut;
  soleil.position.set(Math.cos(a) * 100, ambiance.hauteur * 160, Math.sin(a) * 100);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  soleil.shadow.camera.near = 1;
  soleil.shadow.camera.far = 150;
  const d = 34;
  soleil.shadow.camera.left = -d;
  soleil.shadow.camera.right = d;
  soleil.shadow.camera.top = d;
  soleil.shadow.camera.bottom = -d;
  soleil.shadow.bias = -0.0012;
  scene.add(soleil);
  scene.add(soleil.target);
  scene.userData.soleil = soleil;

  scene.add(new THREE.HemisphereLight(ambiance.hautCiel, 0x4a5540, 1.1));
  scene.add(new THREE.AmbientLight(ambiance.ambiant, 0.5));
  return scene;
}

// Le soleil suit la voiture : la carte d'ombre reste petite et nette.
export function suivreOmbre(scene, x, y, z) {
  const s = scene.userData.soleil;
  if (!s) return;
  s.target.position.set(x, y, z);
  s.position.set(x + 60, y + 90, z + 40);
  s.target.updateMatrixWorld();
}

// Le ciel reste centré sur la caméra, à un rayon inférieur au plan lointain.
export function suivreCiel(scene, camera) {
  const c = scene.userData.ciel;
  if (!c) return;
  c.position.copy(camera.position);
  c.scale.setScalar(camera.far * 0.88);
}
