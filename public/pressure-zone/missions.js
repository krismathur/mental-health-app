/**
 * Mission flow for the first fifteen minutes.
 *
 * A mission is a list of steps. The game reports plain events ("arrived at
 * the court", "made a shot", "chose to help Dev") and the system decides
 * what that means. Mental stat changes are attached to the steps rather than
 * announced, so the player experiences a story, not a lesson.
 *
 * No DOM and no Three.js, so this runs under Node for the headless tests.
 */
import { POIS } from "./world-data.js";
import { recordBehaviour } from "./mental.js";
import { XP_AWARDS, adjustFriendship, awardXp } from "./progress.js";

/**
 * Step types:
 *   goto      - reach a place
 *   talk      - speak to a friend
 *   drill     - make N shots
 *   collect   - pick something up
 *   ride      - be on a given vehicle
 *   choice    - pick one of the offered options
 *   match     - play a game to its end
 *   scripted  - the game advances this one itself
 */
export const MISSIONS = Object.freeze([
    {
        id: "morning",
        title: "Morning",
        chapter: 1,
        brief: "Get up and see what the day looks like.",
        steps: [
            {
                id: "leave-room",
                type: "goto",
                place: "homeDoor",
                label: "Head outside",
                hint: "Walk to the front door of your room."
            },
            {
                id: "meet-mara",
                type: "talk",
                friend: "mara",
                label: "Talk to Mara",
                hint: "She is waiting on the street.",
                dialogue: [
                    { speaker: "Mara", line: "There you are. Did you forget what today is?" },
                    { speaker: "You", line: "...the Fulton Cup." },
                    { speaker: "Mara", line: "Final is tonight. Us and Riverside. They have not lost all season." },
                    { speaker: "Mara", line: "Court in ten. Dev is already there overthinking his jumper." }
                ]
            }
        ],
        rewards: { xp: XP_AWARDS.missionComplete, friendship: { mara: 6 } },
        next: "practice"
    },
    {
        id: "practice",
        title: "Get Your Reps In",
        chapter: 2,
        brief: "Meet Dev at Fulton Court and warm up.",
        steps: [
            {
                id: "go-court",
                type: "goto",
                place: "court",
                label: "Get to Fulton Court",
                hint: "Head east on Main Street."
            },
            {
                id: "drill",
                type: "drill",
                target: 5,
                label: "Make 5 shots",
                hint: "Hold shoot to load, release in the green.",
                onComplete: { behaviour: "cleanDrill" }
            }
        ],
        rewards: { xp: XP_AWARDS.missionComplete, friendship: { dev: 5 } },
        next: "jersey-run"
    },
    {
        id: "jersey-run",
        title: "The Jersey Run",
        chapter: 3,
        brief: "Dev left his jersey at the corner store. It shuts in three minutes.",
        timer: 180,
        steps: [
            {
                id: "get-bike",
                type: "ride",
                vehicle: "bike",
                label: "Grab your bike",
                hint: "It is parked outside your house.",
                optional: true
            },
            {
                id: "reach-store",
                type: "goto",
                place: "store",
                label: "Reach the corner store",
                hint: "Centre Street, north of Main."
            },
            {
                id: "pickup",
                type: "collect",
                item: "jersey",
                label: "Pick up the jersey",
                hint: "Press E at the counter."
            }
        ],
        onTimerSuccess: { behaviour: "beatTheClock" },
        onTimerFail: { behaviour: null, message: "The shutters came down. There is another way to fix this." },
        rewards: { xp: XP_AWARDS.missionComplete, friendship: { dev: 6 } },
        next: "the-long-way"
    },
    {
        id: "the-long-way",
        title: "The Long Way",
        chapter: 4,
        brief: "The storm arrived early and your chain just snapped.",
        weather: "storm",
        steps: [
            {
                id: "breakdown",
                type: "scripted",
                label: "Keep moving",
                hint: "The bike is finished. You are on foot.",
                cinematic: "chain-snap"
            },
            {
                id: "reroute",
                type: "choice",
                label: "Pick a route",
                hint: "The main road is flooded.",
                options: [
                    {
                        id: "alley",
                        label: "Cut through the alley",
                        detail: "Shorter, darker, you have never used it.",
                        behaviours: ["reroutedAfterProblem", "tookRiskyRoute"],
                        discovers: "alley"
                    },
                    {
                        id: "park",
                        label: "Run through the park",
                        detail: "Longer but you know every path.",
                        behaviours: ["reroutedAfterProblem"],
                        discovers: "park"
                    },
                    {
                        id: "wait",
                        label: "Wait out the worst of it",
                        detail: "Safe, but Dev is standing in the rain.",
                        behaviours: []
                    }
                ]
            },
            {
                id: "deliver",
                type: "goto",
                place: "court",
                label: "Get the jersey to Dev",
                hint: "He is under the shelter by the court.",
                onComplete: { behaviour: "finishedAfterSetback" }
            }
        ],
        rewards: { xp: XP_AWARDS.missionComplete + XP_AWARDS.missionBonus, friendship: { dev: 10 } },
        next: "warm-up"
    },
    {
        id: "warm-up",
        title: "Before Tip-Off",
        chapter: 5,
        brief: "Twenty minutes until the final. Dev has not made a shot in warm-ups.",
        steps: [
            {
                id: "decide",
                type: "choice",
                label: "How do you spend warm-ups?",
                hint: "There is not time for both.",
                options: [
                    {
                        id: "help-dev",
                        label: "Rebound for Dev",
                        detail: "He shoots better when someone is counting with him.",
                        behaviours: ["helpedFriend", "encouragedTeammate"],
                        friendship: { dev: 12 },
                        effect: { devConfidence: 0.35 }
                    },
                    {
                        id: "own-drill",
                        label: "Run your own drill",
                        detail: "You get sharper. Dev figures it out or he does not.",
                        behaviours: ["cleanDrill"],
                        effect: { playerAccuracy: 0.08 }
                    },
                    {
                        id: "talk-team",
                        label: "Get everyone together",
                        detail: "Say the thing nobody else wants to say.",
                        behaviours: ["spokeUpFirst", "encouragedTeammate"],
                        friendship: { dev: 6, mara: 8 },
                        effect: { teamMorale: 0.25 }
                    }
                ]
            }
        ],
        rewards: { xp: XP_AWARDS.missionComplete },
        next: "the-final"
    },
    {
        id: "the-final",
        title: "The Fulton Cup Final",
        chapter: 6,
        brief: "Riverside. Full crowd. Everything you have been building toward.",
        steps: [
            {
                id: "tip-off",
                type: "scripted",
                label: "Take the court",
                hint: "Walk to centre court.",
                cinematic: "tip-off"
            },
            {
                id: "play",
                type: "match",
                mode: "tournament",
                label: "Win the final",
                hint: "Riverside start hot. Stay in it."
            }
        ],
        rewards: { xp: XP_AWARDS.matchPlayed, friendship: { mara: 8, dev: 8, nia: 5 } },
        next: null
    }
]);

export function getMission(id) {
    return MISSIONS.find((mission) => mission.id === id) || null;
}

export class MissionSystem {
    constructor(progress, { onEvent = () => {} } = {}) {
        this.progress = progress;
        this.onEvent = onEvent;
        this.mission = null;
        this.stepIndex = 0;
        this.timer = 0;
        this.timerRunning = false;
        this.drillCount = 0;
        this.inventory = new Set();
        this.pendingChoice = null;
        this.timerFailed = false;
    }

    get step() {
        if (!this.mission) return null;
        return this.mission.steps[this.stepIndex] || null;
    }

    get isComplete() {
        return Boolean(this.mission) && this.stepIndex >= this.mission.steps.length;
    }

    /** The next mission that has not been finished yet. */
    nextMissionId() {
        for (const mission of MISSIONS) {
            if (!this.progress.missions.completed.includes(mission.id)) return mission.id;
        }
        return null;
    }

    start(missionId) {
        const mission = getMission(missionId);
        if (!mission) return null;
        this.mission = mission;
        this.stepIndex = 0;
        this.drillCount = 0;
        this.timerFailed = false;
        this.timer = mission.timer || 0;
        this.timerRunning = Boolean(mission.timer);
        this.progress.missions.active = mission.id;
        this.emit("missionStarted", { mission });
        this.emit("stepChanged", { step: this.step, mission });
        return mission;
    }

    startNext() {
        const id = this.nextMissionId();
        return id ? this.start(id) : null;
    }

    emit(type, detail) {
        this.onEvent({ type, detail });
    }

    /** Where the HUD should point the objective marker. */
    get markerPlace() {
        const step = this.step;
        if (!step) return null;
        if (step.type === "goto") return POIS[step.place] || null;
        if (step.type === "talk") return null;
        if (step.type === "drill" || step.type === "match") return POIS.court;
        if (step.type === "collect") return POIS.store;
        return null;
    }

    get objectiveText() {
        const step = this.step;
        if (!step) return this.mission ? "Mission complete" : "Free roam";
        if (step.type === "drill") return `${step.label} (${this.drillCount}/${step.target})`;
        return step.label;
    }

    tick(dt) {
        if (!this.timerRunning || !this.mission) return;
        this.timer = Math.max(0, this.timer - dt);
        if (this.timer <= 0) {
            this.timerRunning = false;
            this.timerFailed = true;
            this.emit("timerExpired", { mission: this.mission });
        }
    }

    /** Whether a step would be satisfied by this event. */
    static matches(step, type, payload) {
        if (!step) return false;
        switch (step.type) {
            case "goto": return type === "arrive" && payload.place === step.place;
            case "talk": return type === "talk" && payload.friend === step.friend;
            case "collect": return type === "collect" && payload.item === step.item;
            case "ride": return type === "ride" && payload.vehicle === step.vehicle;
            case "drill": return type === "shotMade";
            case "match": return type === "matchEnd";
            case "choice": return type === "choice";
            case "scripted": return type === "scripted" && payload.step === step.id;
            default: return false;
        }
    }

    /**
     * The single entry point the game calls. Returns a result describing what
     * changed, or null when the event did not apply to the current step.
     */
    handle(type, payload = {}) {
        if (!this.mission || !this.step) return null;

        // An optional step should never block a player who found their own
        // way. If the event belongs to a later step, skip forward to it.
        while (this.step?.optional
            && !MissionSystem.matches(this.step, type, payload)
            && MissionSystem.matches(this.mission.steps[this.stepIndex + 1], type, payload)) {
            this.completeStep({ skipped: true });
        }

        const step = this.step;
        if (!step) return null;

        switch (type) {
            case "arrive":
                if (step.type === "goto" && payload.place === step.place) return this.completeStep();
                return null;

            case "talk":
                if (step.type === "talk" && payload.friend === step.friend) return this.completeStep();
                return null;

            case "shotMade":
                if (step.type !== "drill") return null;
                this.drillCount += 1;
                this.emit("progressChanged", { step, count: this.drillCount });
                if (this.drillCount >= step.target) return this.completeStep();
                return { advanced: false, count: this.drillCount };

            case "collect":
                if (step.type === "collect" && payload.item === step.item) {
                    this.inventory.add(step.item);
                    return this.completeStep();
                }
                return null;

            case "ride":
                if (step.type === "ride" && payload.vehicle === step.vehicle) {
                    recordBehaviour(this.progress.mental, "switchedTransport");
                    return this.completeStep();
                }
                return null;

            case "choice": {
                if (step.type !== "choice") return null;
                const option = step.options.find((entry) => entry.id === payload.option);
                if (!option) return null;
                this.progress.missions.choices[this.mission.id] = option.id;
                for (const behaviour of option.behaviours || []) {
                    recordBehaviour(this.progress.mental, behaviour);
                }
                for (const [friend, amount] of Object.entries(option.friendship || {})) {
                    adjustFriendship(this.progress, friend, amount);
                }
                if (option.discovers && !this.progress.discovered.includes(option.discovers)) {
                    this.progress.discovered.push(option.discovers);
                }
                return this.completeStep({ option });
            }

            case "matchEnd": {
                if (step.type !== "match") return null;
                if (payload.result === "win") {
                    recordBehaviour(this.progress.mental, "wonMatch");
                    awardXp(this.progress, XP_AWARDS.matchWin, "Won the final");
                    this.progress.stats.matchesWon += 1;
                } else {
                    recordBehaviour(this.progress.mental, "keptPlayingWhileBehind");
                }
                this.progress.stats.matchesPlayed += 1;
                return this.completeStep({ result: payload.result });
            }

            case "scripted":
                if (step.type === "scripted" && payload.step === step.id) return this.completeStep();
                return null;

            case "retry":
                recordBehaviour(this.progress.mental, "retriedAfterLoss");
                return { advanced: false, retried: true };

            default:
                return null;
        }
    }

    /** Skips the current step when the player took a different valid path. */
    skipOptionalStep() {
        const step = this.step;
        if (step && step.optional) return this.completeStep({ skipped: true });
        return null;
    }

    completeStep(extra = {}) {
        const step = this.step;
        if (step?.onComplete?.behaviour) {
            recordBehaviour(this.progress.mental, step.onComplete.behaviour);
        }
        this.stepIndex += 1;
        this.emit("stepCompleted", { step, ...extra });

        if (this.stepIndex >= this.mission.steps.length) return this.completeMission();

        // A skipped optional step should not block the next one.
        this.emit("stepChanged", { step: this.step, mission: this.mission });
        return { advanced: true, step: this.step, missionComplete: false, ...extra };
    }

    completeMission() {
        const mission = this.mission;
        this.timerRunning = false;

        if (mission.timer && !this.timerFailed && mission.onTimerSuccess?.behaviour) {
            recordBehaviour(this.progress.mental, mission.onTimerSuccess.behaviour);
        }

        const xp = awardXp(this.progress, mission.rewards?.xp || 0, mission.title);
        for (const [friend, amount] of Object.entries(mission.rewards?.friendship || {})) {
            adjustFriendship(this.progress, friend, amount);
        }
        if (!this.progress.missions.completed.includes(mission.id)) {
            this.progress.missions.completed.push(mission.id);
        }
        this.progress.missions.active = mission.next;

        this.emit("missionCompleted", { mission, xp });
        return { advanced: true, missionComplete: true, mission, xp, next: mission.next };
    }

    /** Used by the pause screen and the save file. */
    snapshot() {
        return {
            missionId: this.mission?.id ?? null,
            title: this.mission?.title ?? "Free roam",
            chapter: this.mission?.chapter ?? 0,
            objective: this.objectiveText,
            hint: this.step?.hint ?? "",
            timer: this.timerRunning ? this.timer : null,
            drill: this.step?.type === "drill" ? { count: this.drillCount, target: this.step.target } : null,
            choice: this.step?.type === "choice" ? this.step : null
        };
    }
}

/** Optional side activities that keep the world worth wandering around. */
export const DISCOVERIES = Object.freeze([
    { id: "rooftop", place: "rooftop", label: "Rooftop view", behaviour: "exploredNewPlace" },
    { id: "alley", place: "alley", label: "Alley shortcut", behaviour: "exploredNewPlace" },
    { id: "lookout", place: "lookout", label: "Rail bridge lookout", behaviour: "exploredNewPlace" },
    { id: "plaza", place: "plaza", label: "Downtown plaza", behaviour: "exploredNewPlace" },
    { id: "park", place: "park", label: "Bayline Park", behaviour: "exploredNewPlace" }
]);
