    (() => {
      "use strict";

      const canvas = document.getElementById("farm");
      const ctx = canvas.getContext("2d");
      const cols = 15;
      const rows = 10;
      const seasons = ["Spring", "Summer", "Autumn", "Winter"];
      const cropStageDuration = 12000;
      const waterGrowthBoost = 3000;
      const weatherDuration = 30000;
      const seedBundleSize = 3;
      const seedBundlePrice = 12;
      const cropSalePrice = 15;
      const seasonalWeather = {
        Spring: [
          { name: "Sunny", icon: "☀️", effect: "clear" },
          { name: "Light rain", icon: "🌧️", effect: "rain" },
          { name: "Cloudy", icon: "☁️", effect: "cloudy" }
        ],
        Summer: [
          { name: "Sunny", icon: "☀️", effect: "clear" },
          { name: "Cloudy", icon: "☁️", effect: "cloudy" },
          { name: "Light rain", icon: "🌦️", effect: "rain" }
        ],
        Autumn: [
          { name: "Cloudy", icon: "☁️", effect: "cloudy" },
          { name: "Breezy", icon: "🍃", effect: "windy" },
          { name: "Light rain", icon: "🌧️", effect: "rain" }
        ],
        Winter: [
          { name: "Cloudy", icon: "☁️", effect: "cloudy" },
          { name: "Snow", icon: "❄️", effect: "snow" },
          { name: "Breezy", icon: "🍃", effect: "windy" }
        ]
      };
      const seasonColors = {
        Spring: { grass: "#a8cf7e", light: "#b5d98a", dark: "#9dc675", leaf: "#4f9950", sky: "#f4c3a1" },
        Summer: { grass: "#9dc46c", light: "#acd078", dark: "#94bc63", leaf: "#43834a", sky: "#f3d36c" },
        Autumn: { grass: "#c2b86e", light: "#d0c27a", dark: "#b9ae63", leaf: "#bd7040", sky: "#e7a56d" },
        Winter: { grass: "#c2d3c5", light: "#d0dfd2", dark: "#b8ccbd", leaf: "#52795a", sky: "#b7d4e2" }
      };
      const seasonMaps = {
        Spring: "resources/map%201.jpg",
        Summer: "resources/map%202.jpg",
        Autumn: "resources/map%203.jpg",
        Winter: "resources/map%204.jpg"
      };
      const spriteSources = {
        Carlo: {
          down: "resources/carlo.front.png",
          up: "resources/carlo.back.png",
          left: "resources/carlo.side.png",
          right: "resources/carlo.side.png"
        },
        Angel: {
          down: "resources/angel.front.png",
          up: "resources/angel.back.png",
          left: "resources/angel.side.png",
          right: "resources/angel.side.png"
        },
        Karl: {
          down: "resources/karl.front.png",
          up: "resources/karl.back.png",
          left: "resources/karl.right.png",
          right: "resources/karl.right.png"
        }
      };
      const actionSpriteSources = {
        Carlo: {
          move: "resources/carlo.sprint.png",
          plant: "resources/carlo.plant.png",
          water: "resources/carlo.water.png",
          harvest: "resources/carlo.harvest.png"
        },
        Angel: {
          move: "resources/angel.walk.png",
          plant: "resources/angel.plant.png",
          water: "resources/angel.water.png",
          harvest: "resources/angel.harvest.png"
        },
        Karl: {
          move: "resources/karll.run.png",
          water: "resources/karl.plant.png",
          plant: "resources/karl.plant.real.png",
          harvest: "resources/karl.harvest.png"
        }
      };
      const mapFields = {
        Spring: [{ minX: 2, maxX: 4, minY: 7, maxY: 8 }, { minX: 7, maxX: 9, minY: 7, maxY: 8 }],
        Summer: [{ minX: 2, maxX: 5, minY: 7, maxY: 8 }],
        Autumn: [{ minX: 3, maxX: 6, minY: 6, maxY: 7 }],
        Winter: [{ minX: 3, maxX: 6, minY: 6, maxY: 7 }]
      };
      const mapLandmarks = {
        Spring: { cabin: { x: 5, y: 6 }, market: { x: 11, y: 9 }, start: { x: 5, y: 7 } },
        Summer: { cabin: { x: 8, y: 5 }, market: { x: 13, y: 5 }, start: { x: 8, y: 6 } },
        Autumn: { cabin: { x: 8, y: 5 }, market: { x: 12, y: 8 }, start: { x: 8, y: 6 } },
        Winter: { cabin: { x: 8, y: 5 }, market: { x: 12, y: 5 }, start: { x: 8, y: 6 } }
      };
      const mapImages = new Map();
      const characterSprites = new Map();
      const plots = new Map();
      const player = { x: 5, y: 7, facing: "down", step: 0 };
      const state = {
        started: false,
        day: 1,
        coins: 35,
        seeds: 6,
        produce: 0,
        lifetimeHarvest: 0,
        seasonHarvest: 0,
        seasonSales: 0,
        tool: "hoe",
        character: null,
        completed: { Spring: false, Summer: false, Autumn: false, Winter: false },
        lastSale: "—",
        toastTimer: 0,
        action: null,
        motion: null,
        animationFrame: null,
        weatherIndex: 0,
        weatherNextAt: Date.now() + weatherDuration,
        won: false,
        lost: false
      };

      const seasonGoals = {
        Spring: { name: "Spring Sprouts", note: () => `Harvest 3 crops this Spring · ${state.seasonHarvest} / 3`, done: () => state.seasonHarvest >= 3 },
        Summer: { name: "Summer Market", note: () => `Sell 3 crops this Summer · ${state.seasonSales} / 3`, done: () => state.seasonSales >= 3 },
        Autumn: { name: "Autumn Abundance", note: () => `Harvest 4 crops this Autumn · ${state.seasonHarvest} / 4`, done: () => state.seasonHarvest >= 4 },
        Winter: { name: "Winter's End", note: () => `Finish Winter with 100 coins · ${state.coins} / 100`, done: () => state.coins >= 100 }
      };

      const el = {
        season: document.getElementById("season-name"),
        seasonCard: document.getElementById("season-card"),
        farmOwner: document.getElementById("farm-owner"),
        day: document.getElementById("day-line"),
        weather: document.getElementById("weather-line"),
        dayFill: document.querySelector(".day-fill"),
        goalCheck: document.getElementById("task-check"),
        goalName: document.getElementById("task-name"),
        goalNote: document.getElementById("task-note"),
        coins: document.getElementById("coins"),
        harvest: document.getElementById("harvest"),
        seeds: document.getElementById("seeds"),
        seedCount: document.getElementById("seed-count"),
        produce: document.getElementById("produce"),
        lastSale: document.getElementById("last-sale"),
        toast: document.getElementById("toast"),
        overlay: document.getElementById("overlay"),
        overlayTitle: document.getElementById("overlay-title"),
        overlayCopy: document.getElementById("overlay-copy"),
        start: document.getElementById("start-button"),
        characterPicker: document.querySelector(".character-picker"),
        characterButtons: document.querySelectorAll(".character-option"),
        aboutDialog: document.getElementById("about-dialog"),
        aboutButton: document.getElementById("about-button"),
        aboutClose: document.getElementById("about-close"),
        soilSummary: document.getElementById("soil-summary"),
        soilGrid: document.getElementById("soil-grid"),
        currentTool: document.getElementById("current-tool-name"),
        toolDescription: document.getElementById("current-tool-description"),
        currentToolIcon: document.getElementById("current-tool-icon")
      };

      const currentSeason = () => seasons[Math.min(3, Math.floor((state.day - 1) / 7))];
      const fieldContains = (x, y) => mapFields[currentSeason()].some(field =>
        x >= field.minX && x <= field.maxX && y >= field.minY && y <= field.maxY
      );
      const landmark = name => mapLandmarks[currentSeason()][name];
      const tileWidth = canvas.width / cols;
      const tileHeight = canvas.height / rows;
      const key = (x, y) => `${x},${y}`;
      const crop = (x, y) => plots.get(key(x, y));
      const toolDetails = {
        hoe: { name: "Hoe", icon: "⚒", description: "Till a field patch before planting." },
        seed: { name: "Seeds", icon: "🌰", description: "Plant a seed in tilled soil." },
        water: { name: "Watering can", icon: "💧", description: "Give a growing crop a 3-second head start." },
        harvest: { name: "Harvest basket", icon: "🧺", description: "Gather crops that are fully grown." }
      };
      const hoeIcon = '<svg class="hoe-illustration" viewBox="0 0 40 40" role="img" aria-label="Hoe"><path d="M11 31 27 10" stroke="#855a35" stroke-width="4" stroke-linecap="round"/><path d="m23 8 10 4-4 7-10-4z" fill="#89958a" stroke="#53635a" stroke-width="1.5" stroke-linejoin="round"/></svg>';

      function resetWeather() {
        state.weatherIndex = 0;
        state.weatherNextAt = Date.now() + weatherDuration;
      }

      function currentWeather() {
        return seasonalWeather[currentSeason()][state.weatherIndex];
      }

      function formatWeatherCountdown(milliseconds) {
        const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      }

      function loadCharacterSprite(source) {
        const image = new Image();
        image.onload = () => {
          characterSprites.set(source, image);
          draw();
        };
        image.onerror = () => console.error(`Could not load character artwork: ${source}`);
        image.src = source;
      }

      Object.entries(seasonMaps).forEach(([season, source]) => {
        const image = new Image();
        image.onload = () => {
          mapImages.set(season, image);
          draw();
        };
        image.onerror = () => console.error(`Could not load ${season} farm artwork: ${source}`);
        image.src = source;
      });
      const allCharacterSources = Object.values(spriteSources)
        .concat(Object.values(actionSpriteSources))
        .flatMap(sprites => Object.values(sprites));
      new Set(allCharacterSources).forEach(source => {
        characterSprites.set(source, null);
        loadCharacterSprite(source);
      });

      function getFieldTiles() {
        const tiles = [];
        for (const field of mapFields[currentSeason()]) {
          for (let y = field.minY; y <= field.maxY; y++) {
            for (let x = field.minX; x <= field.maxX; x++) tiles.push({ x, y });
          }
        }
        return tiles;
      }

      function getCropProgress(plot, now) {
        if (!plot || !plot.planted) return 0;
        if (plot.growth >= 2) return 100;
        const elapsed = Math.max(0, now - plot.plantedAt);
        return Math.min(100, Math.floor(elapsed / (cropStageDuration * 2) * 100));
      }

      function updateUI() {
        const season = currentSeason();
        const seasonDay = ((state.day - 1) % 7) + 1;
        const goal = seasonGoals[season];
        const done = goal.done();
        el.seasonCard.style.setProperty("--season-map", `url("${seasonMaps[season]}")`);
        el.farmOwner.textContent = state.character ? `${state.character}'s farm • year one` : "Your farm • year one";
        el.season.textContent = season;
        el.day.textContent = `Day ${state.day} of 28 · ${seasonDay} / 7`;
        const weather = currentWeather();
        const weatherCountdown = formatWeatherCountdown(state.weatherNextAt - Date.now());
        el.weather.textContent = `${weather.icon} ${weather.name} · ${weatherCountdown}`;
        el.weather.setAttribute("aria-label", `${weather.name} weather; changes in ${weatherCountdown}`);
        el.dayFill.style.width = `${(seasonDay / 7) * 100}%`;
        el.goalName.textContent = goal.name;
        el.goalNote.textContent = goal.note();
        el.goalNote.classList.toggle("task-complete", done);
        el.goalCheck.classList.toggle("done", done);
        el.goalCheck.textContent = done ? "✓" : "";
        el.coins.textContent = `${state.coins} ✦`;
        el.harvest.textContent = `${state.lifetimeHarvest} 🥕`;
        el.seeds.textContent = `${state.seeds} packets`;
        el.seedCount.textContent = state.seeds;
        el.produce.textContent = `${state.produce} crops`;
        el.lastSale.textContent = state.lastSale;
        const selectedTool = toolDetails[state.tool];
        el.currentTool.textContent = selectedTool.name;
        el.toolDescription.textContent = selectedTool.description;
        if (state.tool === "hoe") {
          el.currentToolIcon.innerHTML = hoeIcon;
        } else {
          el.currentToolIcon.textContent = selectedTool.icon;
          el.currentToolIcon.setAttribute("aria-label", selectedTool.name);
        }
        const now = Date.now();
        const tiles = getFieldTiles();
        let open = 0;
        let prepared = 0;
        let growing = 0;
        let ready = 0;
        el.soilGrid.replaceChildren();
        tiles.forEach(({ x, y }, index) => {
          const plot = crop(x, y);
          const row = Math.floor(index / (mapFields[season][0].maxX - mapFields[season][0].minX + 1));
          const column = index % (mapFields[season][0].maxX - mapFields[season][0].minX + 1);
          const label = `${String.fromCharCode(65 + row)}${column + 1}`;
          const slot = document.createElement("div");
          const icon = document.createElement("span");
          const name = document.createElement("span");
          const progress = document.createElement("span");
          const fill = document.createElement("span");
          const isReady = Boolean(plot && plot.planted && plot.growth >= 2);
          const isGrowing = Boolean(plot && plot.planted && !isReady);
          const status = isReady ? "ready" : isGrowing ? "growing" : plot && plot.tilled ? "prepared" : "open";
          const percentage = isGrowing ? getCropProgress(plot, now) : isReady ? 100 : 0;
          if (isReady) ready++;
          else if (isGrowing) growing++;
          else if (plot && plot.tilled) prepared++;
          else open++;

          slot.className = `soil-slot soil-${status}`;
          slot.setAttribute("aria-label", `Patch ${label}: ${status}${isGrowing || isReady ? `, ${percentage}% grown` : ""}`);
          icon.className = "soil-icon";
          icon.textContent = isReady ? "🥕" : isGrowing ? "🌱" : plot && plot.tilled ? "◌" : "·";
          name.className = "soil-label";
          name.textContent = label;
          progress.className = "soil-progress";
          fill.className = "soil-progress-fill";
          fill.style.width = `${percentage}%`;
          progress.append(fill);
          slot.append(icon, name, progress);
          el.soilGrid.append(slot);
        });
        el.soilSummary.textContent = `${open} open · ${prepared} tilled · ${growing} growing · ${ready} ready`;
        document.querySelectorAll(".tool-button").forEach(button => {
          button.classList.toggle("active", button.dataset.tool === state.tool);
        });
      }

      function notify(message) {
        el.toast.textContent = message;
        el.toast.classList.add("show");
        window.clearTimeout(state.toastTimer);
        state.toastTimer = window.setTimeout(() => el.toast.classList.remove("show"), 2100);
      }

      function setAction(name, duration = 750) {
        if (!state.character) return;
        state.action = { name, until: Date.now() + duration };
        requestAnimationFrame(animatePlayer);
      }

      function animatePlayer() {
        if (state.animationFrame !== null) return;
        const frame = () => {
          state.animationFrame = null;
          const now = performance.now();
          if (state.motion && now - state.motion.startedAt >= state.motion.duration) state.motion = null;
          if (state.action && Date.now() >= state.action.until) state.action = null;
          draw(now);
          if (state.started && (state.motion || state.action)) {
            state.animationFrame = requestAnimationFrame(frame);
          }
        };
        state.animationFrame = requestAnimationFrame(frame);
      }

      function drawPlot(x, y, colors) {
        const plot = crop(x, y);
        const px = x * tileWidth + tileWidth / 2;
        const py = y * tileHeight + tileHeight / 2;
        if (plot && plot.planted) {
          ctx.fillStyle = "#503a2bbd";
          ctx.beginPath();
          ctx.ellipse(px, py + 14, 16, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = colors.leaf;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(px, py + 14);
          ctx.lineTo(px, py - (plot.growth === 0 ? 1 : plot.growth === 1 ? 12 : 19));
          ctx.moveTo(px, py + 3);
          ctx.lineTo(px - 8, py - 3);
          ctx.moveTo(px, py);
          ctx.lineTo(px + 8, py - 7);
          ctx.stroke();

          if (plot.growth >= 2) {
            ctx.fillStyle = "#e47c32";
            ctx.beginPath();
            ctx.moveTo(px - 5, py + 1);
            ctx.lineTo(px + 5, py + 1);
            ctx.lineTo(px, py + 14);
            ctx.closePath();
            ctx.fill();
          }
          if (plot.wateredUntil > Date.now()) {
            ctx.fillStyle = "#8ed9f0";
            ctx.beginPath();
            ctx.arc(px + 16, py - 12, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (plot && plot.tilled) {
          ctx.strokeStyle = "#ffe6a8cc";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(px - 17, py - 14, 34, 28);
          ctx.setLineDash([]);
          ctx.fillStyle = "#fff6d9";
          ctx.font = "bold 15px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("+", px, py + 5);
        }
      }

      function drawPlayer(now = performance.now()) {
        const sources = spriteSources[state.character];
        if (!sources) return;
        const actionSource = state.action && actionSpriteSources[state.character][state.action.name];
        const actionActive = Boolean(state.action && Date.now() < state.action.until);
        const moving = Boolean(state.motion);
        const source = actionSource || (moving && actionSpriteSources[state.character].move) || sources[player.facing] || sources.down;
        const sprite = characterSprites.get(source);
        if (!sprite) return;
        const motionProgress = state.motion
          ? Math.min(1, (now - state.motion.startedAt) / state.motion.duration)
          : 1;
        const tileX = state.motion
          ? state.motion.fromX + (state.motion.toX - state.motion.fromX) * motionProgress
          : player.x;
        const tileY = state.motion
          ? state.motion.fromY + (state.motion.toY - state.motion.fromY) * motionProgress
          : player.y;
        const centerX = tileX * tileWidth + tileWidth / 2;
        const bob = moving || actionActive ? Math.sin(now / 42) * 2 : 0;
        const footY = tileY * tileHeight + tileHeight * .83 + bob;
        const spriteHeight = tileHeight * (actionSource ? 1.3 : 1.15);
        const spriteWidth = sprite.width / sprite.height * spriteHeight;
        const mirrored = player.facing === "left" &&
          (sources.left === sources.right || (moving && source === actionSpriteSources[state.character].move));
        ctx.save();
        if (mirrored) {
          ctx.translate(centerX * 2, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(sprite, centerX - spriteWidth / 2, footY - spriteHeight, spriteWidth, spriteHeight);
        ctx.restore();
      }

      function draw(now = performance.now()) {
        const season = currentSeason();
        const colors = seasonColors[season];
        const background = mapImages.get(season);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (background) {
          ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = colors.grass;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        drawWeather(currentWeather().effect, Date.now());
        for (const [position, plot] of plots) {
          const [x, y] = position.split(",").map(Number);
          if (fieldContains(x, y)) drawPlot(x, y, colors);
        }
        drawPlayer(now);
      }

      function drawWeather(effect, now) {
        if (effect === "cloudy") {
          ctx.fillStyle = "#43516a12";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          return;
        }
        if (effect !== "rain" && effect !== "snow") return;

        const offset = Math.floor(now / 90);
        ctx.save();
        ctx.globalAlpha = effect === "rain" ? 0.36 : 0.68;
        if (effect === "rain") {
          ctx.strokeStyle = "#d8f3ff";
          ctx.lineWidth = 1.5;
          for (let index = 0; index < 36; index++) {
            const x = (index * 97 + offset * 3) % canvas.width;
            const y = (index * 67 + offset * 7) % canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 4, y + 11);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = "#ffffff";
          for (let index = 0; index < 26; index++) {
            const x = (index * 131 + Math.sin(offset / 8 + index) * 16) % canvas.width;
            const y = (index * 89 + offset * 2) % canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, index % 3 === 0 ? 2 : 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      function useTool() {
        if (!state.started || state.won || state.lost) return;
        if (state.motion) return;
        const { x, y } = player;
        const market = landmark("market");
        const cabin = landmark("cabin");
        if (x === market.x && y === market.y) {
          useMarket();
          return;
        }
        if (x === cabin.x && y === cabin.y) {
          sleep();
          return;
        }
        if (!fieldContains(x, y)) {
          notify("Find a field tile, the market, or your cabin.");
          return;
        }
        const plot = crop(x, y);
        if (state.tool === "hoe") {
          if (plot && plot.planted) notify("There's a crop growing here. Give it some care!");
          else if (plot && plot.tilled) notify("This patch is ready for seeds.");
          else {
            plots.set(key(x, y), { tilled: true, planted: false, growth: 0 });
            notify("Soil turned! Select Seeds to plant.");
          }
        } else if (state.tool === "seed") {
          if (state.seeds <= 0) {
            notify("You're out of seeds. Buy more at the market.");
          } else if (!plot || !plot.tilled) {
            notify("Use the Hoe on this patch first.");
          } else if (plot.planted) {
            notify("Something is already growing here.");
          } else {
            plot.planted = true;
            plot.growth = 0;
            plot.plantedAt = Date.now();
            plot.wateredGrowth = -1;
            plot.wateredUntil = 0;
            state.seeds--;
            notify("Seeds planted! Crops grow on their own; watering gives them a head start.");
            setAction("plant");
          }
        } else if (state.tool === "water") {
          if (!plot || !plot.planted) notify("There's nothing planted here to water.");
          else if (plot.growth >= 2) notify("This crop is ready to harvest!");
          else if (plot.wateredGrowth === plot.growth) notify("This growth stage has already been watered. Let it grow a little more.");
          else {
            plot.plantedAt -= waterGrowthBoost;
            plot.wateredGrowth = plot.growth;
            plot.wateredUntil = Date.now() + 2400;
            notify("Watered! The crop has a head start.");
            setAction("water");
          }
        } else if (state.tool === "harvest") {
          if (plot && plot.planted && plot.growth >= 2) {
            plots.delete(key(x, y));
            state.produce++;
            state.lifetimeHarvest++;
            state.seasonHarvest++;
            notify("Fresh crop gathered! Take it to the market.");
            setAction("harvest");
          } else if (plot && plot.planted) notify("Not quite ready. Crops grow automatically over time.");
          else notify("Nothing to harvest on this patch.");
        }
        updateUI();
        draw();
      }

      function useMarket() {
        if (state.produce > 0) {
          const sold = state.produce;
          const earned = sold * cropSalePrice;
          state.produce = 0;
          state.coins += earned;
          state.seasonSales += sold;
          state.lastSale = `+${earned} ✦`;
          notify(`Sold ${sold} crop${sold === 1 ? "" : "s"} for ${earned} coins!`);
        } else if (state.coins >= seedBundlePrice) {
          state.coins -= seedBundlePrice;
          state.seeds += seedBundleSize;
          state.lastSale = `Seeds −${seedBundlePrice} ✦`;
          notify(`Bought ${seedBundleSize} seeds for ${seedBundlePrice} coins.`);
        } else {
          notify(`No crops to sell—and a ${seedBundleSize}-seed bundle costs ${seedBundlePrice} coins.`);
        }
        updateUI();
        draw();
      }

      function sleep() {
        if (state.day >= 28) {
          finishGame();
          return;
        }
        const previous = currentSeason();
        state.day++;
        const next = currentSeason();
        if (next !== previous) {
          if (seasonGoals[previous].done()) state.completed[previous] = true;
          state.seasonHarvest = 0;
          state.seasonSales = 0;
          plots.clear();
          resetWeather();
          player.x = mapLandmarks[next].start.x;
          player.y = mapLandmarks[next].start.y;
          notify(`${next} has arrived. A new seasonal goal awaits!`);
        } else {
          notify("You rested. Crops keep growing as you tend the farm.");
        }
        if (state.day === 28 && seasonGoals.Winter.done()) state.completed.Winter = true;
        updateUI();
        draw();
      }

      function finishGame() {
        if (seasonGoals.Winter.done()) state.completed.Winter = true;
        state.won = seasons.every(season => state.completed[season] || (season === currentSeason() && seasonGoals[season].done()));
        state.lost = !state.won;
        el.overlayTitle.textContent = state.won ? "You made it, farmkeeper!" : "The seasons have passed";
        el.overlayCopy.textContent = state.won
          ? "You tended your land through Spring, Summer, Autumn, and Winter. Your little farm is thriving—and your HarvestBound story is just beginning."
          : "A full year has gone by, but one or more seasonal goals were left unfinished. Every farmer gets another chance to grow.";
        el.characterPicker.hidden = true;
        el.start.textContent = state.won ? "Play again" : "Try again";
        el.start.disabled = false;
        el.overlay.classList.remove("hidden");
        state.started = false;
      }

      function startGame() {
        if (!state.character) return;
        if (state.won || state.lost) {
          plots.clear();
          state.day = 1;
          state.coins = 35;
          state.seeds = 6;
          state.produce = 0;
          state.lifetimeHarvest = 0;
          state.seasonHarvest = 0;
          state.seasonSales = 0;
          state.tool = "hoe";
          state.completed = { Spring: false, Summer: false, Autumn: false, Winter: false };
          state.lastSale = "—";
          state.won = false;
          state.lost = false;
          player.x = mapLandmarks.Spring.start.x;
          player.y = mapLandmarks.Spring.start.y;
        }
        state.started = true;
        resetWeather();
        el.overlayTitle.textContent = `Let's grow, ${state.character}!`;
        el.overlayCopy.textContent = "Plant, water, and harvest crops. They grow over time on their own, and watering gives them a head start. Complete each seasonal task to keep your farm running.";
        el.characterPicker.hidden = false;
        el.overlay.classList.add("hidden");
        updateUI();
        draw();
      }

      function move(dx, dy) {
        if (!state.started || state.won || state.lost) return;
        if (state.motion) return;
        const nx = Math.max(0, Math.min(cols - 1, player.x + dx));
        const ny = Math.max(0, Math.min(rows - 1, player.y + dy));
        if (nx === player.x && ny === player.y) return;
        const fromX = player.x;
        const fromY = player.y;
        player.x = nx;
        player.y = ny;
        player.step = 1 - player.step;
        player.facing = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
        state.action = null;
        state.motion = { fromX, fromY, toX: nx, toY: ny, startedAt: performance.now(), duration: 180 };
        animatePlayer();
      }

      let lastSoilProgressUpdate = 0;
      window.setInterval(() => {
        if (!state.started) return;
        const now = Date.now();
        let changed = false;
        let becameReady = false;
        let hasGrowingCrop = false;
        for (const plot of plots.values()) {
          if (!plot.planted || plot.growth >= 2) continue;
          hasGrowingCrop = true;
          const growth = Math.min(2, Math.floor((now - plot.plantedAt) / cropStageDuration));
          if (growth > plot.growth) {
            plot.growth = growth;
            changed = true;
            becameReady ||= growth === 2;
          }
        }
        if (changed) {
          updateUI();
          draw();
          lastSoilProgressUpdate = now;
          if (becameReady) notify("A crop is ready to harvest!");
        } else if (hasGrowingCrop && now - lastSoilProgressUpdate >= 500) {
          updateUI();
          lastSoilProgressUpdate = now;
        }
      }, 250);

      let lastWeatherUiUpdate = 0;
      window.setInterval(() => {
        if (!state.started) return;
        const now = Date.now();
        if (now >= state.weatherNextAt) {
          const weatherList = seasonalWeather[currentSeason()];
          state.weatherIndex = (state.weatherIndex + 1) % weatherList.length;
          state.weatherNextAt = now + weatherDuration;
          updateUI();
          draw();
          notify(`${currentWeather().name} weather has arrived.`);
          lastWeatherUiUpdate = now;
          return;
        }
        if (now - lastWeatherUiUpdate >= 1000) {
          updateUI();
          lastWeatherUiUpdate = now;
        }
        const effect = currentWeather().effect;
        if (effect === "rain" || effect === "snow") draw();
      }, 250);

      document.addEventListener("keydown", event => {
        const keyName = event.key.toLowerCase();
        if (el.aboutDialog.open) {
          if (keyName === "escape") el.aboutDialog.close();
          return;
        }
        const directions = {
          arrowup: [0, -1], w: [0, -1],
          arrowdown: [0, 1], s: [0, 1],
          arrowleft: [-1, 0], a: [-1, 0],
          arrowright: [1, 0], d: [1, 0]
        };
        if (directions[keyName]) {
          event.preventDefault();
          move(...directions[keyName]);
          return;
        }
        if (keyName === " " || keyName === "e") {
          event.preventDefault();
          useTool();
        } else if (["1", "2", "3", "4"].includes(keyName)) {
          state.tool = ["", "hoe", "seed", "water", "harvest"][Number(keyName)];
          updateUI();
        }
      });

      el.aboutButton.addEventListener("click", () => el.aboutDialog.showModal());
      el.aboutClose.addEventListener("click", () => el.aboutDialog.close());
      el.aboutDialog.addEventListener("click", event => {
        if (event.target === el.aboutDialog) el.aboutDialog.close();
      });
      el.characterButtons.forEach(button => {
        button.addEventListener("click", () => {
          state.character = button.dataset.character;
          el.characterButtons.forEach(option => {
            const selected = option === button;
            option.classList.toggle("selected", selected);
            option.setAttribute("aria-pressed", String(selected));
          });
          el.start.disabled = false;
          el.start.textContent = `Start as ${state.character}`;
          updateUI();
          draw();
        });
      });
      document.querySelectorAll(".tool-button").forEach(button => {
        button.addEventListener("click", () => {
          state.tool = button.dataset.tool;
          updateUI();
        });
      });
      el.start.addEventListener("click", startGame);

      updateUI();
      draw();
    })();
  