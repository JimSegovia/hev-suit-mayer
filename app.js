import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {buildChild,childMaterial,MEASURES,DEFAULTS} from './child.js';

const host=document.getElementById('canvas'), status=document.getElementById('status'),info=document.getElementById('info');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.01,1000);
camera.position.set(2,1.5,3);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x45535f,2.3));const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-3,5,4);scene.add(sun);
const grid=new THREE.GridHelper(10,20,0x52616b,0x39454d);grid.position.y=-.002;scene.add(grid);
const child=new THREE.Group();scene.add(child);orbit.target.set(0,.7,0);camera.position.set(1.6,1.2,2.6);
let model=null,edges=[],meshes=[],box=null,selected=null;
function setStatus(s){status.textContent=s}
function geometryEdges(mesh){const geometry=mesh.geometry;if(!geometry.attributes.position)return;const threshold=document.getElementById('triangles').checked?0:15;const line=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,threshold),new THREE.LineBasicMaterial({color:0x0a151b,transparent:true,opacity:.82,depthTest:true}));line.position.copy(mesh.position);line.quaternion.copy(mesh.quaternion);line.scale.copy(mesh.scale);mesh.parent.add(line);edges.push(line)}
function updateView(){for(const m of meshes){m.material.visible=document.getElementById('surface').checked}for(const e of edges)e.visible=document.getElementById('edges').checked}
function show(source,name){if(model)scene.remove(model);model=source;edges=[];meshes=[];selected=null;scene.add(model);model.traverse(o=>{if(!o.isMesh)return;meshes.push(o);o.material=new THREE.MeshStandardMaterial({color:0xe28b29,roughness:.72,side:THREE.DoubleSide,flatShading:true});geometryEdges(o)});if(!meshes.length){setStatus('El archivo no contiene una malla visible.');return}box=new THREE.Box3().setFromObject(model);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());if(!Number.isFinite(size.length())||size.length()===0){setStatus('No se pudo calcular el tamaño de la malla.');return}model.position.x-=center.x;model.position.z-=center.z;model.position.y-=box.min.y;box.setFromObject(model);const s=box.getSize(new THREE.Vector3());const radius=Math.max(s.x,s.y,s.z);camera.position.set(radius*1.45,s.y/2+radius*.3,radius*1.85);camera.near=Math.max(radius/1000,.001);camera.far=radius*50;camera.updateProjectionMatrix();orbit.target.set(0,(box.min.y+box.max.y)/2,0);orbit.update();updateView();let triangles=0;for(const m of meshes)triangles+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3;document.getElementById('modelName').textContent=name.toUpperCase();info.innerHTML=`<b>${meshes.length}</b> mallas<br><b>${Math.round(triangles).toLocaleString('es-PE')}</b> triángulos<br>Dimensiones del archivo: ${s.x.toFixed(1)} × ${s.y.toFixed(1)} × ${s.z.toFixed(1)} unidades`;setStatus('Modelo cargado. Ya puedes inspeccionar sus polígonos.');}
async function loadData(data,name){try{const ext=name.split('.').pop().toLowerCase();let obj;if(ext==='obj')obj=new OBJLoader().parse(new TextDecoder().decode(data));else if(ext==='stl'){obj=new THREE.Group();obj.add(new THREE.Mesh(new STLLoader().parse(data)))}else if(ext==='glb'||ext==='gltf'){obj=(await new GLTFLoader().parseAsync(data,'')).scene}else throw Error('Formato no compatible');show(obj,name)}catch(e){setStatus('No se pudo abrir el modelo: '+e.message);console.error(e)}}
document.getElementById('file').addEventListener('change',async e=>{const f=e.target.files[0];if(f)await loadData(await f.arrayBuffer(),f.name)});
for(const id of ['surface','edges'])document.getElementById(id).onchange=updateView;
document.getElementById('triangles').onchange=()=>{if(!model)return;for(const e of edges){e.parent.remove(e);e.geometry.dispose()}edges=[];meshes.forEach(geometryEdges);updateView()};
document.getElementById('front').onclick=()=>{if(!box)return;const r=box.getSize(new THREE.Vector3()).length();camera.position.set(0,(box.min.y+box.max.y)/2,r*1.7);orbit.target.set(0,(box.min.y+box.max.y)/2,0);orbit.update()};
document.getElementById('fit').onclick=()=>{if(!box)return;const r=box.getSize(new THREE.Vector3()).length();camera.position.set(r*.6,(box.min.y+box.max.y)/2+r*.2,r);orbit.target.set(0,(box.min.y+box.max.y)/2,0);orbit.update()};
renderer.domElement.addEventListener('click',e=>{if(!model)return;const rect=renderer.domElement.getBoundingClientRect(),point=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(point,camera);const hit=ray.intersectObjects(meshes,true)[0];if(selected)selected.material.color.set(0xe28b29);if(hit){selected=hit.object;selected.material.color.set(0xffc15e);info.innerHTML+=`<br>Cara seleccionada: ${hit.faceIndex+1}`}});
function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}new ResizeObserver(resize).observe(host);
function tick(){requestAnimationFrame(tick);if(document.getElementById('spin').checked&&model)model.rotation.y+=.004;orbit.update();renderer.render(scene,camera)}resize();tick();
fetch('models/hev-suit.obj').then(r=>{if(!r.ok)throw Error();return r.arrayBuffer()}).then(b=>loadData(b,'hev-suit.obj')).catch(()=>setStatus('Aún no hay un archivo HEV en models/. Usa “Cargar modelo 3D” para abrir uno descargado.'));

const KEY='hev-medidas-hermano-v4',panel=document.getElementById('measures'),fields={};
let measures={...DEFAULTS};try{Object.assign(measures,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}
const childToggle=document.getElementById('child'),childGhost=document.getElementById('childGhost');
const silTex=new THREE.TextureLoader().load('images/silueta.png');silTex.colorSpace=THREE.SRGBColorSpace;
const silhouette=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:silTex,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));silhouette.renderOrder=-1;scene.add(silhouette);
const silToggle=document.getElementById('silhouette'),SIL_ASPECT=552/1381;
let pending=false;
function rebuild(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;buildChild(child,measures);child.visible=childToggle.checked;const H=measures.height/100;silhouette.visible=silToggle.checked;silhouette.scale.set(H*SIL_ASPECT,H,1);silhouette.position.set(0,H/2,-.02);if(!model)box=new THREE.Box3().setFromObject(child);childMaterial.opacity=childGhost.checked?.3:.85;childMaterial.depthWrite=!childGhost.checked;try{localStorage.setItem(KEY,JSON.stringify(measures))}catch{}})}
function setMeasure(id,v){if(!Number.isFinite(v))return;measures[id]=v;fields[id].range.value=v;if(document.activeElement!==fields[id].num)fields[id].num.value=v;rebuild()}
for(const m of MEASURES){if(m.group){panel.insertAdjacentHTML('beforeend',`<div class="mgroup">${m.group}</div>`);continue}
const row=document.createElement('div');row.className='mrow';
row.innerHTML=`<div class="mtop"><span>${m.label}</span><span class="mnum"><input type="number" step="0.5" min="${m.min}" max="${m.max}"> ${m.unit||'cm'}</span></div><input type="range" step="0.5" min="${m.min}" max="${m.max}"><small>${m.hint}</small>`;
panel.append(row);const num=row.querySelector('input[type=number]'),range=row.querySelector('input[type=range]');fields[m.id]={num,range,m};
range.value=num.value=measures[m.id];
range.oninput=()=>setMeasure(m.id,+range.value);
num.oninput=()=>{const v=+num.value;if(num.value!==''&&Number.isFinite(v)){measures[m.id]=v;range.value=v;rebuild()}};
num.onchange=()=>{const v=Math.min(m.max,Math.max(m.min,+num.value||m.def));num.value=v;setMeasure(m.id,v)}}
document.getElementById('resetMeasures').onclick=()=>{measures={...DEFAULTS};for(const id in fields){fields[id].range.value=fields[id].num.value=measures[id]}rebuild()};
for(const el of [childToggle,childGhost,silToggle])el.oninput=rebuild;rebuild();
