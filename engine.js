(function (root) {
  "use strict";

  const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
  const BLOCK_SECONDS = 7200;
  const SLOT_HOURS = [0,2,4,6,8,10,12,14,16,18,20,22];

  function stationParts(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone:TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23"
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
  }

  function zonedToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    let guess = target;
    for (let index = 0; index < 4; index += 1) {
      const part = stationParts(new Date(guess));
      const represented = Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second);
      guess += target - represented;
    }
    return guess;
  }

  function dateKey(nowMs) {
    const part = stationParts(new Date(nowMs));
    return `${part.year}-${String(part.month).padStart(2,"0")}-${String(part.day).padStart(2,"0")}`;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function seededShuffle(items, seedText) {
    const copy = items.slice();
    let seed = hash(seedText);
    const random = () => {
      seed += 0x6D2B79F5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function kindForHour(hour) {
    if (hour < 6) return "synth";
    if (hour < 18) return "science";
    return "movie";
  }

  function labelForKind(kind) {
    return kind === "synth" ? "MIDNIGHT SYNTH" : kind === "movie" ? "PHYSICS AT THE MOVIES" : "PHYSICS LAB";
  }

  function createDaySchedule(nowMs, catalog) {
    const part = stationParts(new Date(nowMs));
    const midnightMs = zonedToUtc(part.year, part.month, part.day);
    const dayNumber = Math.floor(midnightMs / 86400000);
    const weekNumber = Math.floor(dayNumber / 7);
    const todayKey = dateKey(nowMs);
    const pools = {};
    ["science","movies","synth"].forEach(key => {
      const pool = Array.isArray(catalog && catalog[key]) ? catalog[key].filter(item => item && item.cleared && item.videoId) : [];
      if (!pool.length) throw new Error(`No Physics TV ${key} sources are ready.`);
      pools[key] = seededShuffle(pool, `physics-tv-${key}-week-${weekNumber}`);
    });
    const counters = {science:0, movie:0, synth:0};
    const countsPerDay = {science:6, movie:3, synth:3};
    return SLOT_HOURS.map((hour, slotIndex) => {
      const kind = kindForHour(hour);
      const poolKey = kind === "movie" ? "movies" : kind;
      const countKey = kind;
      const pool = pools[poolKey];
      const index = (dayNumber * countsPerDay[countKey] + counters[countKey]++) % pool.length;
      const program = pool[(index + pool.length) % pool.length];
      const startsAtMs = midnightMs + hour * 3600000;
      return {
        id:`${todayKey}-${String(slotIndex).padStart(2,"0")}`,
        kind, label:labelForKind(kind), program,
        startsAtMs, endsAtMs:startsAtMs + BLOCK_SECONDS * 1000,
        blockSeconds:BLOCK_SECONDS
      };
    });
  }

  function createSegments(block) {
    const requested = Math.max(60, Math.floor(Number(block.program.runtimeSeconds) || BLOCK_SECONDS));
    const duration = Math.min(BLOCK_SECONDS, requested);
    const segments = [{
      kind:block.kind, title:block.program.title, videoId:block.program.videoId, cleared:true,
      sourceStart:0, stationStart:0, duration
    }];
    if (duration < BLOCK_SECONDS) {
      segments.push({kind:"station", title:block.kind === "movie" ? "Physics cinema intermission" : block.kind === "synth" ? "Synth station intermission" : "Physics lab intermission", videoId:"", cleared:true, sourceStart:0, stationStart:duration, duration:BLOCK_SECONDS-duration});
    }
    return segments;
  }

  function resolve(nowMs, schedule) {
    const block = schedule.find(item => nowMs >= item.startsAtMs && nowMs < item.endsAtMs) || schedule[schedule.length - 1] || schedule[0];
    const blockElapsed = Math.max(0, Math.min(BLOCK_SECONDS - 1, Math.floor((nowMs - block.startsAtMs) / 1000)));
    const segments = createSegments(block);
    const segment = segments.find(item => blockElapsed >= item.stationStart && blockElapsed < item.stationStart + item.duration) || segments[segments.length - 1];
    const segmentElapsed = Math.max(0, blockElapsed - segment.stationStart);
    return {
      block, segment, blockElapsed, segmentElapsed,
      mediaSeconds:segment.sourceStart + segmentElapsed,
      segmentRemaining:Math.max(0, segment.duration - segmentElapsed),
      blockRemaining:Math.max(0, BLOCK_SECONDS - blockElapsed)
    };
  }

  root.PhysicsEngine = { TIME_ZONE, BLOCK_SECONDS, dateKey, stationParts, zonedToUtc, kindForHour, labelForKind, createDaySchedule, createSegments, resolve };
})(window);
