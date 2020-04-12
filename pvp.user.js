// ==UserScript==
// @name        Precise video playback (YouTube)
// @namespace   moe.suisei.pvp.youtube
// @match       https://www.youtube.com/watch*
// @grant       none
// @version     0.3
// @author      Outvi V <oss@outv.im>
// @description 4/12/2020, 8:13:19 PM
// ==/UserScript==

"use strict";

console.log("Precise Video Playback is up");

function generateControl() {
  let app = document.createElement("div");
  let inputFrom = document.createElement("input");
  inputFrom.placeholder = "from time";
  let inputTo = document.createElement("input");
  inputTo.placeholder = "to time";
  let currentTime = document.createElement("span");
  let btn = document.createElement("button");
  let btnStop = document.createElement("button");
  btn.innerText = "Repeat play";
  btnStop.innerText = "Stop";
  app.appendChild(inputFrom);
  app.appendChild(inputTo);
  app.appendChild(currentTime);
  app.appendChild(btn);
  app.appendChild(btnStop);
  return {
    app,
    inputFrom,
    inputTo,
    currentTime,
    btn,
    btnStop,
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
  let control = generateControl();
  console.log(player);
  player.appendChild(control.app);
  function updateCurrentTime() {
    control.currentTime.innerText = Number(videoElement.currentTime).toFixed(2);
    requestAnimationFrame(updateCurrentTime);
  }
  function onTimeUpdate() {
    if (videoElement.currentTime >= Number(control.inputTo.value)) {
      videoElement.currentTime = Number(control.inputFrom.value);
    }
  }
  requestAnimationFrame(updateCurrentTime);
  control.btn.addEventListener("click", (evt) => {
    evt.preventDefault();
    if (control.inputFrom.value && control.inputTo.value) {
      videoElement.pause();
      videoElement.currentTime = Number(control.inputFrom.value);
      videoElement.play();
      videoElement.addEventListener("timeupdate", onTimeUpdate);
    }
  });
  control.btnStop.addEventListener("click", (evt) => {
    evt.preventDefault();
    videoElement.removeEventListener("timeupdate", onTimeUpdate);
    videoElement.pause();
  });
}

main();