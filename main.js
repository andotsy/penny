import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const slides = [...document.querySelectorAll(".slide")];
const deck = document.querySelector("#deck");
const currentLabel = document.querySelector("[data-current-slide]");
const totalLabel = document.querySelector("[data-total-slides]");
const progress = document.querySelector(".deck-progress i");
const chapterNav = document.querySelector(".chapter-nav");
let currentSlide = 0;
let touchStart = null;
let viewerInitializationScheduled = false;
let viewerInitializationStarted = false;

totalLabel.textContent = String(slides.length).padStart(2, "0");

slides.forEach((slide, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `Slide ${index + 1}: ${slide.dataset.title}`);
  button.innerHTML = `<i></i><span>${slide.dataset.title}</span>`;
  button.addEventListener("click", () => showSlide(index));
  chapterNav.append(button);
});

const chapterButtons = [...chapterNav.querySelectorAll("button")];

function scheduleViewerInitialization(slide) {
  if (!slide.querySelector("#pen-viewer") || viewerInitializationScheduled || viewerInitializationStarted) {
    return;
  }

  viewerInitializationScheduled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const start = () => {
        viewerInitializationScheduled = false;
        if (viewerInitializationStarted) return;
        viewerInitializationStarted = true;
        initializeViewer();
      };

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(start, { timeout: 1500 });
      } else {
        setTimeout(start, 0);
      }
    });
  });
}

function showSlide(index, { updateHash = true } = {}) {
  const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
  if (nextIndex === currentSlide && slides[nextIndex].classList.contains("is-active")) {
    return;
  }

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === nextIndex;
    slide.classList.toggle("is-active", isActive);
    slide.classList.toggle("is-before", slideIndex < nextIndex);
    slide.setAttribute("aria-hidden", String(!isActive));

    slide.querySelectorAll("video").forEach((video) => {
      if (isActive && video.closest("[data-media]")?.classList.contains("has-media")) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  });

  currentSlide = nextIndex;
  document.body.classList.toggle("on-light-slide", slides[nextIndex].dataset.chrome === "dark");
  currentLabel.textContent = String(nextIndex + 1).padStart(2, "0");
  progress.style.transform = `scaleX(${(nextIndex + 1) / slides.length})`;
  chapterButtons.forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === nextIndex);
    button.setAttribute("aria-current", buttonIndex === nextIndex ? "step" : "false");
  });

  document.title = `${String(nextIndex + 1).padStart(2, "0")} · ${slides[nextIndex].dataset.title} — Project Penny`;
  if (updateHash) {
    history.replaceState(null, "", `#${nextIndex + 1}`);
  }

  scheduleViewerInitialization(slides[nextIndex]);
}

function navigate(direction) {
  showSlide(currentSlide + direction);
}

document.querySelector("[data-deck-action='previous']").addEventListener("click", () => navigate(-1));
document.querySelector("[data-deck-action='next']").addEventListener("click", () => navigate(1));
document.querySelector("[data-home]")?.addEventListener("click", () => showSlide(0));

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    navigate(1);
  } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    navigate(-1);
  } else if (event.key === "Home") {
    event.preventDefault();
    showSlide(0);
  } else if (event.key === "End") {
    event.preventDefault();
    showSlide(slides.length - 1);
  } else if (event.key.toLowerCase() === "f") {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }
});

deck.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

deck.addEventListener("touchend", (event) => {
  if (!touchStart || event.target.closest("#pen-viewer")) {
    touchStart = null;
    return;
  }

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
    navigate(dx < 0 ? 1 : -1);
  }
  touchStart = null;
}, { passive: true });

window.addEventListener("hashchange", () => {
  const requested = Number.parseInt(location.hash.slice(1), 10);
  if (Number.isInteger(requested)) {
    showSlide(requested - 1, { updateHash: false });
  }
});

function initializeMediaSlots() {
  document.querySelectorAll("[data-media]").forEach((slot) => {
    const media = slot.querySelector("[data-media-content]");
    if (!media) return;

    const markReady = () => {
      slot.classList.remove("is-loading");
      slot.classList.add("has-media");
      if (media instanceof HTMLVideoElement && slot.closest(".slide")?.classList.contains("is-active")) {
        media.play().catch(() => {});
      }
    };

    const markMissing = () => slot.classList.remove("has-media", "is-loading");
    media.addEventListener("error", markMissing);

    if (media instanceof HTMLVideoElement) {
      slot.classList.add("is-loading");   // spinner on the placeholder until first ready event
      // Safari (desktop + iOS) with preload="metadata" frequently stalls at HAVE_METADATA and
      // never fires "loadeddata" until playback starts — so the slot stayed hidden and the gate
      // that plays active-slide videos never opened. Reveal on the EARLIEST ready signal, and
      // kick load() so metadata actually arrives.
      ["loadedmetadata", "loadeddata", "canplay"].forEach((ev) => media.addEventListener(ev, markReady));
      if (media.readyState >= HTMLMediaElement.HAVE_METADATA) markReady();
      else media.load();
    } else {
      media.addEventListener("load", markReady);
      if (media.complete && media.naturalWidth > 0) {
        markReady();
      } else if (media.getAttribute("src")) {
        // image referenced but not downloaded yet (slow network / large photo): same
        // spinner as videos. complete===true with naturalWidth 0 means a broken file —
        // the error handler clears the state.
        slot.classList.add("is-loading");
      }
    }
  });
}

function initializeViewer() {
  const stage = document.querySelector("#pen-viewer");
  if (!stage) return;

  const canvas = stage.querySelector("canvas");
  const loading = stage.querySelector("[data-viewer-loading]");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 1200);
  camera.position.set(156, 92, 188);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 105;
  controls.maxDistance = 420;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.75;

  scene.add(new THREE.HemisphereLight(0xf5f1df, 0x142320, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffecd2, 5.2);
  keyLight.position.set(120, 90, 160);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x8ffff2, 3.2);
  rimLight.position.set(-140, 20, -80);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xffa64d, 1.8);
  fillLight.position.set(20, -120, 20);
  scene.add(fillLight);

  const modelRoot = new THREE.Group();
  modelRoot.rotation.x = -Math.PI / 2;
  modelRoot.rotation.z = -0.16;
  modelRoot.scale.setScalar(0.93);
  scene.add(modelRoot);

  const assembly = new THREE.Group();
  modelRoot.add(assembly);

  const materials = {
    chassis: new THREE.MeshPhysicalMaterial({ color: 0x3b3e3d, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    cover: new THREE.MeshPhysicalMaterial({ color: 0x3b3e3d, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    clip: new THREE.MeshPhysicalMaterial({ color: 0x3b3e3d, roughness: 0.3, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
    battery: new THREE.MeshPhysicalMaterial({ color: 0xd9a441, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }),
    electronics: new THREE.MeshPhysicalMaterial({ color: 0x3f8f7a, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide }),
    refill: new THREE.MeshPhysicalMaterial({ color: 0x8a8f93, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }),
  };

  const modelDefinitions = [
    { key: "chassis", file: "v10_chassis.stl", splitDirection: new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0) },
    { key: "cover", file: "v10_cover.stl", splitDirection: new THREE.Vector3(-Math.SQRT1_2, -Math.SQRT1_2, 0) },
    { key: "clip", file: "v10_clip.stl", splitDirection: new THREE.Vector3(1.25, 0, 0) },
    // internals ride with the CHASSIS during the explode (bottom-first assembly doctrine)
    { key: "battery", file: "v10_battery.stl", splitDirection: new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0), internal: true },
    { key: "electronics", file: "v10_electronics.stl", splitDirection: new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0), internal: true },
    { key: "refill", file: "v10_refill.stl", splitDirection: new THREE.Vector3(Math.SQRT1_2, Math.SQRT1_2, 0), internal: true },
  ];

  const meshes = new Map();
  const bounds = new THREE.Box3();
  let splitAmount = 0;
  let clipLift = 0;
  let clipAway = 0;
  let clipTilt = 0;
  let clipRotation = 0;
  let xray = false;
  let internalsOn = true;
  let warmupFrames = 0;   // >0 forces renders while the slide is hidden (GPU warm-up)

  const modelWorker = new Worker(new URL("./stl-worker.js", import.meta.url), { type: "module" });
  const loadingLabel = loading.querySelector("strong");
  let loadFailed = false;

  const failLoading = (error) => {
    if (loadFailed) return;
    loadFailed = true;
    console.error(error);
    loadingLabel.textContent = "Model failed to load";
    loading.classList.add("has-error");
    modelWorker.terminate();
  };

  modelWorker.addEventListener("message", ({ data }) => {
    if (data.type === "progress") {
      loadingLabel.textContent = `Loading ${data.key}`;
      return;
    }

    if (data.type === "error") {
      failLoading(new Error(data.message));
      return;
    }

    if (data.type === "model") {
      const definition = modelDefinitions.find(({ key }) => key === data.key);
      const geometry = new THREE.BufferGeometry();
      Object.entries(data.attributes).forEach(([name, attribute]) => {
        geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.normalized));
      });
      if (data.index) {
        geometry.setIndex(new THREE.BufferAttribute(data.index.array, data.index.itemSize, data.index.normalized));
      }

      geometry.boundingBox = new THREE.Box3(
        new THREE.Vector3(...data.bounds.min),
        new THREE.Vector3(...data.bounds.max),
      );
      bounds.union(geometry.boundingBox);

      const mesh = new THREE.Mesh(geometry, materials[data.key]);
      mesh.userData.internal = Boolean(definition.internal);
      mesh.visible = definition.internal ? internalsOn : true;
      mesh.userData.splitDirection = definition.splitDirection;
      mesh.userData.targetPosition = new THREE.Vector3();
      mesh.userData.key = data.key;

      if (data.key === "clip") {
        const motionRoot = new THREE.Group();
        const tiltRoot = new THREE.Group();
        const clipCenter = geometry.boundingBox.getCenter(new THREE.Vector3());
        tiltRoot.position.copy(clipCenter);
        mesh.position.copy(clipCenter).multiplyScalar(-1);
        tiltRoot.add(mesh);
        motionRoot.add(tiltRoot);
        assembly.add(motionRoot);
        mesh.userData.motionRoot = motionRoot;
        mesh.userData.tiltRoot = tiltRoot;
        // radially OUTWARD on the clip's own side of the pen - retreating along this
        // direction keeps it clear of the cover's split path (never across the body)
        const outward = new THREE.Vector3(clipCenter.x, clipCenter.y, 0);
        if (outward.lengthSq() < 1e-6) outward.set(-Math.SQRT1_2, -Math.SQRT1_2, 0);
        mesh.userData.outwardDir = outward.normalize();
        mesh.userData.basePosition = motionRoot.position.clone();
      } else {
        assembly.add(mesh);
        mesh.userData.motionRoot = mesh;
        mesh.userData.basePosition = new THREE.Vector3();
      }

      meshes.set(data.key, mesh);
      return;
    }

    if (data.type === "complete") {
      assembly.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-1);
      loading.classList.add("is-done");
      stage.classList.add("is-ready");
      modelWorker.terminate();
      setTimeout(() => loading.remove(), 500);
      // warm-up: compile the shaders and draw a few hidden frames NOW, so arriving on
      // the slide costs nothing (slides are visibility:hidden - the canvas has real size)
      const armWarmup = () => { warmupFrames = 3; };
      if (typeof renderer.compileAsync === "function") {
        renderer.compileAsync(scene, camera).then(armWarmup, armWarmup);
      } else {
        renderer.compile(scene, camera);
        armWarmup();
      }
    }
  });
  modelWorker.addEventListener("error", failLoading);
  modelWorker.postMessage({
    models: modelDefinitions.map(({ key, file }) => ({
      key,
      url: new URL(`${import.meta.env.BASE_URL}models/${file}`, window.location.href).href,
    })),
  });

  const updateMaterials = () => {
    Object.values(materials).forEach((material) => {
      material.transparent = xray;
      material.opacity = xray ? 0.24 : 1;
      material.depthWrite = !xray;
      material.needsUpdate = true;
    });
  };

  const clipControl = stage.querySelector("[data-view-clip]");
  const clipOutput = stage.querySelector("[data-view-clip-output]");
  const assemblyControl = stage.querySelector("[data-view-assembly]");
  const assemblyOutput = stage.querySelector("[data-view-assembly-output]");

  const setSplit = (amount) => {
    splitAmount = amount;
  };

  clipControl.addEventListener("input", () => {
    clipRotation = THREE.MathUtils.degToRad(Number(clipControl.value));
    clipOutput.textContent = `${clipControl.value}°`;
  });

  assemblyControl.addEventListener("input", () => {
    const percent = Number(assemblyControl.value);
    const progress = percent / 100;
    const exploded = 1 - progress;
    // disassembly order: straight lift out of the pivot socket -> a slight bow ->
    // a short outward retreat clear of the halves -> ONLY THEN the halves split
    // (the clip skirt must never sit in the cover's path)
    const liftProgress = THREE.MathUtils.smoothstep(exploded, 0, 0.3);
    const tiltProgress = THREE.MathUtils.smoothstep(exploded, 0.22, 0.45);
    const awayProgress = THREE.MathUtils.smoothstep(exploded, 0.4, 0.62);
    const halvesProgress = THREE.MathUtils.smoothstep(exploded, 0.62, 1);
    clipLift = liftProgress * 26;
    clipTilt = tiltProgress * THREE.MathUtils.degToRad(15);
    clipAway = awayProgress * 30;
    setSplit(halvesProgress * 24);
    assemblyOutput.textContent = percent === 100 ? "built" : percent === 0 ? "exploded" : `${percent}%`;
  });

  stage.querySelector("[data-view-spin]").addEventListener("change", (event) => {
    controls.autoRotate = event.target.checked;
  });

  stage.querySelector("[data-view-xray]").addEventListener("change", (event) => {
    xray = event.target.checked;
    updateMaterials();
  });

  stage.querySelector("[data-view-internals]").addEventListener("change", (event) => {
    internalsOn = event.target.checked;
    meshes.forEach((mesh) => {
      if (mesh.userData.internal) mesh.visible = internalsOn;
    });
  });

  const resetView = () => {
    camera.position.set(156, 92, 188);
    controls.target.set(0, 0, 0);
    controls.update();
    modelRoot.rotation.z = -0.16;
    setSplit(0);
    clipLift = 0;
    clipAway = 0;
    clipTilt = 0;
    clipRotation = 0;
    clipControl.value = "0";
    clipOutput.textContent = "0°";
    assemblyControl.value = "100";
    assemblyOutput.textContent = "built";
  };

  stage.querySelector("[data-view-action='reset']").addEventListener("click", resetView);

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  resize();

  const clock = new THREE.Clock();
  const render = () => {
    requestAnimationFrame(render);
    const delta = Math.min(clock.getDelta(), 0.05);

    // dormant while the slide is hidden (after warm-up): no per-frame GPU work
    // during the other 13 slides, instant resume on arrival - everything stays warm
    const slideActive = stage.closest(".slide").classList.contains("is-active");
    if (!slideActive && warmupFrames === 0) return;
    if (warmupFrames > 0) warmupFrames -= 1;

    meshes.forEach((mesh) => {
      const target = mesh.userData.targetPosition;
      const motionRoot = mesh.userData.motionRoot;
      target.copy(mesh.userData.basePosition);
      if (mesh.userData.key === "clip") {
        target.z += clipLift;
        target.addScaledVector(mesh.userData.outwardDir, clipAway);
        mesh.userData.tiltRoot.rotation.x = clipTilt;
        motionRoot.rotation.z = THREE.MathUtils.damp(motionRoot.rotation.z, clipRotation, 7, delta);
        motionRoot.position.copy(target);
      } else {
        target.addScaledVector(mesh.userData.splitDirection, splitAmount / 2);
        motionRoot.position.lerp(target, 1 - Math.pow(0.0005, delta));
      }
    });

    controls.autoRotate = stage.querySelector("[data-view-spin]").checked && slideActive;
    controls.update();
    renderer.render(scene, camera);
  };
  render();
}

initializeMediaSlots();

const initialSlide = Number.parseInt(location.hash.slice(1), 10);
showSlide(Number.isInteger(initialSlide) ? initialSlide - 1 : 0, { updateHash: false });

// warm the 3D viewer right after first paint, not when its slide opens: the STLs
// download+parse in a worker, then shaders compile against the hidden (but sized) canvas
const viewerSlide = slides.find((slide) => slide.querySelector("#pen-viewer"));
if (viewerSlide) scheduleViewerInitialization(viewerSlide);
