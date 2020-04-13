// ==UserScript==
// @name        Precise video playback (YouTube)
// @name:zh-CN  精确控制视频播放进度 (YouTube)
// @description A toolbar to set precise video play time and generate clip script
// @description:zh-CN 精确控制视频播放进度/生成剪辑脚本的工具栏
// @namespace   moe.suisei.pvp.youtube
// @match       https://www.youtube.com/watch*
// @grant       none
// @version     0.5.1
// @author      Outvi V
// ==/UserScript==

"use strict";

console.log("Precise Video Playback is up");

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

parseTime("0:4.2");

function generateControl() {
  let app = document.createElement("div");
  let inputFrom = document.createElement("input");
  inputFrom.placeholder = "from time";
  let inputTo = document.createElement("input");
  inputTo.placeholder = "to time";
  let currentTime = document.createElement("span");
  let btn = document.createElement("button");
  let btnStop = document.createElement("button");
  let btnExport = document.createElement("button");
  applyStyle(app, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: "700px",
    marginTop: "15px",
    marginLeft: "auto",
    marginRight: "auto",
  });
  applyStyle(currentTime, {
    fontSize: "1.3rem",
  });
  let inputCommonStyle = {
    width: "120px",
  };
  applyStyle(inputFrom, inputCommonStyle);
  applyStyle(inputTo, inputCommonStyle);
  btn.innerText = "Repeat play";
  btnStop.innerText = "Stop";
  btnExport.innerText = "Export";
  app.appendChild(inputFrom);
  app.appendChild(inputTo);
  app.appendChild(currentTime);
  app.appendChild(btn);
  app.appendChild(btnStop);
  app.appendChild(btnExport);
  return {
    app,
    inputFrom,
    inputTo,
    currentTime,
    btn,
    btnStop,
    btnExport,
  };
}

async function sleep(time) {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

async function main() {
  // Player fetching
  console.log("Waiting for the player...");
  let player;
  while (true) {
    player = document.querySelector("ytd-app #player");
    if (player && !player.hidden) break;
    await sleep(500);
  }
  let videoElement = document.querySelector("video");
  if (!videoElement || !player) {
    console.warn("Player not found. Exiting.");
    return;
  }
  console.log("Player detected.");

  // Layout
  let control = generateControl();
  console.log(player);
  player.appendChild(control.app);

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
output-${videoId}-${fromValue}-${toValue}.mp3`);
  });
}

main();
