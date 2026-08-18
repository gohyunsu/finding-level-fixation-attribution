const fixations = [
  [316,158,.03],[262,202,.05],[214,273,.04],[246,351,.06],
  [304,418,.05],[382,474,.04],[447,447,.05],[476,380,.07],
  [430,326,.13],[451,282,.20],[417,246,.15],[461,236,.10],
  [498,286,.06],[423,303,.11],[356,322,.04],[292,281,.02]
];

const stages = [
  { name: "Complete scanpath", description: "All recorded fixations remain visible." },
  { name: "Finding-conditioned weights", description: "Circle size encodes the learned fixation weight." },
  { name: "Gaze-supported localization map", description: "Weighted fixations are rendered into a spatial map." }
];

const results = {
  pointing: {
    max: .9,
    rows: [
      ["Complete scanpath density", .4063],
      ["1.5-s temporal", .6211],
      ["1.5-s combined structured", .7923],
      ["3.0-s combined structured", .7893],
      ["Learned selector · 5-seed mean", .8245, "learned"]
    ],
    claim: "Peak placement retains a visible learned difference.",
    detail: "Seed-0 learned minus the 3.0-s structured reference: +0.0405, 95% patient-cluster interval +0.0108 to +0.0696."
  },
  iou: {
    max: .4,
    rows: [
      ["Complete scanpath density", .2008],
      ["1.5-s temporal", .2773],
      ["1.5-s combined structured", .3439],
      ["3.0-s combined structured", .3549],
      ["Learned selector · 5-seed mean", .3584, "learned"]
    ],
    claim: "The strongest tested structured overlap nearly matches learned overlap.",
    detail: "Seed-0 difference: +0.0036, 95% patient-cluster interval −0.0039 to +0.0108; patient-level signed-rank p = 0.665."
  }
};

const heterogeneity = [
  ["Atelectasis", .0184, .0188],
  ["Consolidation", -.0288, -.0032],
  ["Cardiac silhouette", .0517, .0796],
  ["Ground-glass opacity", -.0600, .0004],
  ["Lung nodule / mass", .1357, -.0120],
  ["Pleural abnormality", .1314, .0118],
  ["Pulmonary edema", -.0178, -.0021]
];

const fractions = [
  ["10%", .3350, .3206], ["25%", .3408, .3327],
  ["50%", .3423, .3389], ["100%", .3439, .3584]
];

const svgNS = "http://www.w3.org/2000/svg";
const fixationLayer = document.querySelector("#fixation-layer");
const heatLayer = document.querySelector("#heat-layer");
const scanpathLine = document.querySelector("#scanpath-line");
const cursor = document.querySelector("#cursor");
const slider = document.querySelector("#fixation-time");
const countOutput = document.querySelector("#fixation-count");
let stage = 0;
let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let cursorTimer;
let cursorIndex = 0;

function buildDemo() {
  scanpathLine.setAttribute("points", fixations.map(([x,y]) => `${x},${y}`).join(" "));
  fixations.forEach(([x,y,w], index) => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.classList.add("fixation");
    circle.dataset.index = index;
    circle.dataset.weight = w;
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 8);
    fixationLayer.appendChild(circle);

    const heat = document.createElementNS(svgNS, "circle");
    heat.classList.add("heat-spot");
    heat.setAttribute("cx", x);
    heat.setAttribute("cy", y);
    heat.setAttribute("r", 48 + w * 170);
    heat.setAttribute("fill", "url(#heat)");
    heat.dataset.index = index;
    heatLayer.appendChild(heat);
  });
  setPlaybackPosition(0);
}

function updateDemo() {
  const visible = Number(slider.value);
  countOutput.value = `${visible} / ${fixations.length}`;
  slider.setAttribute("aria-valuetext", `${visible} of ${fixations.length} fixations`);
  document.querySelector("#stage-name").textContent = stages[stage].name;
  document.querySelectorAll(".stage-button").forEach((button, index) => button.classList.toggle("active", index === stage));
  document.querySelectorAll(".fixation").forEach((circle, index) => {
    const w = Number(circle.dataset.weight);
    const shown = index < visible;
    circle.style.opacity = shown ? (stage === 2 ? .26 : 1) : .04;
    circle.setAttribute("r", stage === 1 ? 7 + w * 82 : 8 + index * .17);
    circle.setAttribute("fill", stage === 1 ? (w > .09 ? "#ff9d5c" : "#788ca5") : `hsl(${225 - index * 5} 72% ${68 - index * .6}%)`);
  });
  document.querySelectorAll(".heat-spot").forEach((spot, index) => {
    spot.style.opacity = stage === 2 && index < visible ? Math.min(1, Number(fixations[index][2]) * 5.5) : 0;
  });
  scanpathLine.setAttribute("points", fixations.slice(0, visible).map(([x,y]) => `${x},${y}`).join(" "));
  scanpathLine.style.opacity = stage === 0 ? .6 : .12;
  cursor.style.opacity = stage === 0 ? 1 : 0;
}

function setPlaybackPosition(index) {
  cursorIndex = Math.max(0, Math.min(fixations.length - 1, index));
  slider.value = String(cursorIndex + 1);
  const [x,y] = fixations[cursorIndex];
  cursor.setAttribute("cx", x);
  cursor.setAttribute("cy", y);
  updateDemo();
}

function setStage(next) {
  stage = next;
  setPlaybackPosition(0);
}

function startAutoplay() {
  clearInterval(cursorTimer);
  if (!playing) return;
  cursorTimer = setInterval(() => {
    if (cursorIndex === fixations.length - 1) {
      setStage((stage + 1) % stages.length);
    } else {
      setPlaybackPosition(cursorIndex + 1);
    }
  }, 230);
}

document.querySelectorAll(".stage-button").forEach((button) => {
  button.addEventListener("click", () => { setStage(Number(button.dataset.stage)); startAutoplay(); });
});
slider.addEventListener("input", () => setPlaybackPosition(Number(slider.value) - 1));
document.querySelector("#play-toggle").addEventListener("click", (event) => {
  playing = !playing;
  event.currentTarget.textContent = playing ? "Pause" : "Play";
  event.currentTarget.setAttribute("aria-pressed", String(playing));
  event.currentTarget.setAttribute("aria-label", playing ? "Pause automatic replay" : "Play automatic replay");
  startAutoplay();
});

function renderResults(metric) {
  const model = results[metric];
  const scale = `<div class="result-scale" aria-hidden="true"><span></span><div><span>0</span><span>${model.max.toFixed(2)}</span></div><span></span></div>`;
  document.querySelector("#result-chart").innerHTML = scale + model.rows.map(([label, value, kind]) => `
    <div class="result-row ${kind || ""}">
      <span class="result-label">${label}</span>
      <span class="result-track" role="img" aria-label="${label}: ${value.toFixed(4)}"><span class="result-bar" style="width:${value / model.max * 100}%"></span></span>
      <span class="result-value">${value.toFixed(3)}</span>
    </div>`).join("");
  document.querySelector("#metric-claim").textContent = model.claim;
  document.querySelector("#metric-detail").textContent = model.detail;
  document.querySelectorAll(".metric-button").forEach((button) => button.classList.toggle("active", button.dataset.metric === metric));
}

function renderHeterogeneity(metric) {
  const index = metric === "pointing" ? 1 : 2;
  const maximum = .15;
  document.querySelector("#heterogeneity-chart").innerHTML = heterogeneity.map((row) => {
    const value = row[index];
    const width = Math.min(50, Math.abs(value) / maximum * 50);
    return `<div class="heterogeneity-row"><span>${row[0]}</span><span class="diverging-track"><span class="diverging-bar ${value >= 0 ? "positive" : "negative"}" style="width:${width}%"></span></span><span class="heterogeneity-value">${value >= 0 ? "+" : ""}${value.toFixed(3)}</span></div>`;
  }).join("");
  document.querySelectorAll(".heterogeneity-button").forEach((button) => button.classList.toggle("active", button.dataset.metric === metric));
}

function renderFractions() {
  const min = .28, max = .37;
  const height = (v) => `${Math.max(4, (v - min) / (max - min) * 100)}%`;
  document.querySelector("#fraction-chart").innerHTML = fractions.map(([label, structured, learned]) => `
    <div class="fraction-group">
      <div class="fraction-bar" style="height:${height(structured)}"><span>${structured.toFixed(3)}</span></div>
      <div class="fraction-bar learned" style="height:${height(learned)}"><span>${learned.toFixed(3)}</span></div>
      <label>${label}</label>
    </div>`).join("");
}

document.querySelectorAll(".metric-button").forEach((button) => button.addEventListener("click", () => renderResults(button.dataset.metric)));
document.querySelectorAll(".heterogeneity-button").forEach((button) => button.addEventListener("click", () => renderHeterogeneity(button.dataset.metric)));

buildDemo();
renderResults("pointing");
renderHeterogeneity("pointing");
renderFractions();
startAutoplay();
