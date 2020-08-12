// ==UserScript==
// @name        Precise video playback (YouTube)
// @name:zh-CN  精确控制视频播放进度 (YouTube)
// @description A toolbar to set precise video play time and generate clip script
// @description:zh-CN 精确控制视频播放进度/生成剪辑脚本的工具栏
// @homepage    https://github.com/suisei-cn/pvp
// @namespace   moe.suisei.pvp.youtube
// @match       https://www.youtube.com/*
// @match       https://youtube.com/*
// @grant       none
// @version     0.7.0
// @author      Outvi V
// ==/UserScript==

"use strict";

let control;

console.log("Precise Video Playback is up. Watching for video players...");

function createCutButton(time, videoElement) {
  let btnJump = document.createElement("button");
  let btnRemove = document.createElement("button");
  let btnContainer = document.createElement("div");
  btnJump.innerText = time;
  btnRemove.innerText = "x";
  btnJump.addEventListener("click", () => {
    videoElement.currentTime = time;
  });
  btnRemove.addEventListener("click", () => {
    btnContainer.style.display = "none";
  });
  applyStyle(btnContainer, {
    marginRight: "0.5vw",
    flexShrink: "0",
  });
  btnContainer.append(btnJump, btnRemove);
  return btnContainer;
}

function getVideoId(url) {
  return String(url).match(/v=([^&#]+)/)[1];
}

function applyStyle(elem, styles) {
  for (const [key, value] of Object.entries(styles)) {
    elem.style[key] = value;
  }
}

function parseTime(str) {
  if (!isNaN(Number(str))) return Number(str);
  let time = str.match(/([0-9]?)?:([0-9]+)(\.([0-9]+))?/);
  if (time === null) return -1;
  let ret =
    Number(time[1] || 0) * 60 + Number(time[2]) + Number(time[4] || 0) * 0.1;
  if (ret == NaN) return -1;
  return ret;
}

function generateControl() {
  let app = document.createElement("div");
  let cutBar = document.createElement("div");
  let inputFrom = document.createElement("input");
  inputFrom.placeholder = "from time";
  let inputTo = document.createElement("input");
  inputTo.placeholder = "to time";
  let currentTime = document.createElement("span");
  let btn = document.createElement("button");
  let btnStop = document.createElement("button");
  let btnExport = document.createElement("button");
  let btnCut = document.createElement("button");
  applyStyle(app, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: "700px",
    marginTop: "15px",
    marginLeft: "auto",
    marginRight: "auto",
  });
  applyStyle(cutBar, {
    display: "flex",
    flexWrap: "wrap",
    marginTop: "1.5vh",
  });
  applyStyle(currentTime, {
    fontSize: "1.3rem",
    minWidth: "8.1rem",
    textAlign: "center",
    color: "var(--yt-spec-text-primary)",
  });
  let inputCommonStyle = {
    width: "120px",
  };
  applyStyle(inputFrom, inputCommonStyle);
  applyStyle(inputTo, inputCommonStyle);
  btn.innerText = "Repeat play";
  btnStop.innerText = "Stop";
  btnExport.innerText = "Export";
  btnCut.innerText = "Cut";
  app.appendChild(inputFrom);
  app.appendChild(inputTo);
  app.appendChild(currentTime);
  app.appendChild(btn);
  app.appendChild(btnStop);
  app.appendChild(btnExport);
  app.appendChild(btnCut);
  return {
    app,
    cutBar,
    inputFrom,
    inputTo,
    currentTime,
    btn,
    btnStop,
    btnExport,
    btnCut,
  };
}

async function sleep(time) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

function generateFullControl(videoElement) {
  let control = generateControl();

  // States
  let fromValue = 0,
    toValue = 0;

  // Initial state update attempt
  let urlTime = window.location.hash.match(
    /#pvp([0-9]+\.?[0-9]?)-([0-9]+\.?[0-9]?)/
  );
  if (urlTime !== null) {
    console.log("Attempting to recover time from URL...");
    control.inputFrom.value = fromValue = Number(urlTime[1]) || 0;
    control.inputTo.value = toValue = Number(urlTime[2]) || 0;
  }

  // Current playback time
  function updateCurrentTime() {
    control.currentTime.innerText = Number(videoElement.currentTime).toFixed(2);
    requestAnimationFrame(updateCurrentTime);
  }
  requestAnimationFrame(updateCurrentTime);

  // Repeat playback
  function onTimeUpdate() {
    if (videoElement.currentTime >= Number(toValue)) {
      videoElement.currentTime = Number(fromValue);
    }
  }
  control.btn.addEventListener("click", (evt) => {
    evt.preventDefault();
    videoElement.pause();
    videoElement.currentTime = fromValue;
    if (fromValue < toValue) {
      videoElement.play();
      videoElement.addEventListener("timeupdate", onTimeUpdate);
    } else {
      videoElement.removeEventListener("timeupdate", onTimeUpdate);
    }
  });
  control.btnStop.addEventListener("click", (evt) => {
    evt.preventDefault();
    videoElement.removeEventListener("timeupdate", onTimeUpdate);
    videoElement.pause();
  });
  control.btnCut.addEventListener("click", () => {
    let nowTime = Number(videoElement.currentTime).toFixed(2);
    let btn = createCutButton(nowTime, videoElement);
    control.cutBar.append(btn);
  });

  // Start/end time setting
  function updateURL() {
    history.pushState(null, null, `#pvp${fromValue}-${toValue}`);
  }
  control.inputFrom.addEventListener("change", () => {
    let input = control.inputFrom.value;
    if (input === "") {
      fromValue = 0;
      control.inputFrom.placeholder = "from 0";
      return;
    }
    let time = parseTime(input);
    if (time == -1) {
      control.btn.disabled = true;
      return;
    }
    control.btn.disabled = false;
    fromValue = time;
    updateURL();
  });
  control.inputTo.addEventListener("change", () => {
    let input = control.inputTo.value;
    if (input === "") {
      toValue = videoElement.duration || 0;
      control.inputTo.placeholder = `to ${toValue.toFixed(2)}`;
      return;
    }
    let time = parseTime(input);
    if (time == -1) {
      control.btn.disabled = true;
      return;
    }
    control.btn.disabled = false;
    toValue = time;
    updateURL();
  });

  // Button export
  control.btnExport.addEventListener("click", (evt) => {
    evt.preventDefault();
    let videoId = getVideoId(window.location);
    alert(`ffmpeg -i $(youtube-dl -f bestaudio -g "https://www.youtube.com/watch?v=${videoId}") \
-ss ${fromValue} \
-to ${toValue} \
-acodec libmp3lame \
-ab 192k \
-af loudnorm=I=-16:TP=-2:LRA=11 \
-vn \
output-${videoId}-${fromValue}-${toValue}.mp3`);
  });

  return control;
}

function keepControl() {
  if (!String(window.location).includes("/watch?")) return;
  if (!control || control.app.offsetHeight === 0) {
    console.log(
      "New video playback page found. Trying to insert the widget..."
    );
    const video = document.querySelector("video");
    const anchor = document.querySelector("ytd-video-primary-info-renderer");
    if (!video || !anchor) return;
    console.log("Video and anchor found. Releasing the widget...");
    control = generateFullControl(video);
    anchor.parentElement.insertBefore(control.app, anchor);
    anchor.parentElement.insertBefore(control.cutBar, anchor);
    console.log("The widget is up.");
  }
}

keepControl();
setInterval(keepControl, 1000);
