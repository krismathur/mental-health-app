"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const createStorage = require("../public/js/account-storage");
function backingStore() {
    const values = new Map();
    return { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
}
function practice(storage, date, search = "", speech) {
    const nodes = new Map();
    function node(id) {
        if (!nodes.has(id)) {
            const handlers = {};
            nodes.set(id, { id, hidden:false, disabled:false, style:{}, dataset:{}, textContent:"", classList:{toggle(){}}, setAttribute(){}, querySelectorAll(){return [];}, addEventListener: (name, fn) => {handlers[name]=fn;}, click(event={}) {handlers.click?.(event);} });
        }
        return nodes.get(id);
    }
    const timeouts = new Map(); let timer = 0; let interval; let xp = 0;
    const window = {MindZoneStorage:storage, AppTime:{getToday:()=>date.value}, location:{search}, scrollTo(){}, addEventListener(){}, addRewardProgress: v => {xp += v.xp;}};
    if (speech) {window.speechSynthesis=speech;}
    const context = vm.createContext({window, document:{getElementById:node, querySelectorAll:()=>[]}, URLSearchParams, Date, console, SpeechSynthesisUtterance: function(text){this.text=text;}, setTimeout:fn=>{const id=++timer;timeouts.set(id,fn);return id;}, clearTimeout:id=>timeouts.delete(id), setInterval:fn=>{interval=fn;return ++timer;}, clearInterval:()=>{interval=null;}});
    vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/js/daily-session.js"),"utf8"),context);
    const tap = (container, field, value) => {const button=node(value);button.dataset[field]=value;node(container).click({target:{closest:()=>button},currentTarget:node(container)});};
    return {node, context, timeouts, get xp(){return xp;}, read(){node("beginSessionBtn").click();node("visualizeReadBtn").click();node("visualizeDoneBtn").click();}, breathe(){node("breathStartBtn").click();for(let i=0;i<96;i++){interval?.();}node("breathDoneBtn").click();}, finish(){tap("releaseChoices","release","A mistake");tap("resetChoices","reset","Next play.");node("finishSessionBtn").click();}};
}
test("siblings' practice, mood and rewards stay isolated, and return visits restore their own state",()=>{
    const raw=backingStore();raw.setItem("mindzone_daily_session_history",'["legacy"]');const storage=createStorage(raw);
    storage.bind(1);storage.setItem("mindzone_mood_history","child-one");storage.setItem("mindzone_xp",20);
    const date={value:"2026-10-05"};const first=practice(storage,date);first.read();first.breathe();first.finish();assert.equal(first.xp,20);
    storage.bind(null);assert.equal(storage.getItem("mindzone_mood_history"),null);
    storage.bind(2);assert.equal(storage.getItem("mindzone_daily_session_history"),null);assert.equal(storage.getItem("mindzone_mood_history"),null);assert.equal(storage.getItem("mindzone_xp"),null);
    const sibling=practice(storage,date);assert.equal(sibling.node("alreadyCompleteNote").hidden,true);
    storage.bind(1);assert.equal(storage.getItem("mindzone_mood_history"),"child-one");assert.equal(practice(storage,date).node("alreadyCompleteNote").hidden,false);assert.equal(raw.getItem("mindzone_daily_session_history"),'["legacy"]');
});
test("completion rewards once per day, advances sequential plans once, and supports the next day",()=>{
    const storage=createStorage(backingStore());storage.bind(1);const date={value:"2026-10-05"};
    const flow=practice(storage,date,"?planId=7&day=1");flow.read();flow.breathe();flow.finish();flow.node("finishSessionBtn").click();assert.equal(flow.xp,20);assert.equal(JSON.parse(storage.getItem("mindzone_plan_progress")).lastCompletedDay,1);
    const repeat=practice(storage,date,"?planId=7&day=2");repeat.read();repeat.breathe();repeat.finish();assert.equal(repeat.xp,0);assert.equal(JSON.parse(storage.getItem("mindzone_plan_progress")).lastCompletedDay,1);
    date.value="2026-10-06";const tomorrow=practice(storage,date,"?planId=7&day=2");assert.equal(tomorrow.node("alreadyCompleteNote").hidden,true);tomorrow.read();tomorrow.breathe();tomorrow.finish();assert.equal(tomorrow.xp,20);assert.equal(JSON.parse(storage.getItem("mindzone_plan_progress")).lastCompletedDay,2);
    const stale=practice(storage,date,"?planId=7&day=1");stale.read();stale.breathe();stale.finish();assert.equal(JSON.parse(storage.getItem("mindzone_plan_progress")).lastCompletedDay,2);
});
test("audio failure requires reading, and pause during a line gap cannot skip a line",()=>{
    const storage=createStorage(backingStore());storage.bind(1);let utterance;const speech={speaking:false,speak:u=>{utterance=u;},cancel(){},pause(){},resume(){}};
    const flow=practice(storage,{value:"2026-10-05"},"",speech);flow.node("visualizeDoneBtn").disabled=true;flow.node("beginSessionBtn").click();flow.node("visualizePlayBtn").click();utterance.onerror();assert.equal(flow.node("visualizeDoneBtn").disabled,true);flow.node("visualizeReadBtn").click();assert.equal(flow.node("visualizeDoneBtn").disabled,false);assert.match(flow.node("visualizeReadAlong").textContent,/I can reset/);assert.match(flow.node("visualizeProgressText").textContent,/0 \/ 10/);
    const gap=practice(storage,{value:"2026-10-05"},"",speech);gap.node("visualizePlayBtn").click();utterance.onstart();utterance.onend();assert.match(gap.node("visualizeProgressText").textContent,/1 \/ 10/);gap.node("visualizePlayBtn").click();assert.equal(gap.timeouts.size,0);gap.node("visualizePlayBtn").click();assert.match(utterance.text,/Picture the place/);
});
test("current plan focus and sport reach the routine without exposing a sibling or stale focus",()=>{
    const storage=createStorage(backingStore());storage.bind(1);storage.setItem("mindzone_sport","Tennis");storage.setItem("mindzone_practice_focus",JSON.stringify({date:"2026-10-05",planId:"7",day:1,title:"Reset after a miss"}));
    const flow=practice(storage,{value:"2026-10-05"},"?planId=7&day=1");assert.match(flow.node("sessionFocus").textContent,/Reset after a miss/);flow.read();assert.match(flow.node("visualizeReadAlong").textContent,/play Tennis/);assert.match(flow.node("visualizeReadAlong").textContent,/Reset after a miss/);
    assert.equal(practice(storage,{value:"2026-10-06"},"?planId=7&day=2").node("sessionFocus").textContent,"");storage.bind(2);assert.equal(practice(storage,{value:"2026-10-05"},"?planId=7&day=1").node("sessionFocus").textContent,"");
});
test("the three exercises rotate by date and stay stable for the whole day",()=>{
    const storage=createStorage(backingStore());storage.bind(1);storage.setItem("mindzone_sport","Tennis");
    const first=practice(storage,{value:"2026-10-05"});
    const sameDay=practice(storage,{value:"2026-10-05"});
    const nextDay=practice(storage,{value:"2026-10-06"});
    assert.equal(first.node("dailyRoutineName").textContent,sameDay.node("dailyRoutineName").textContent);
    assert.equal(first.node("releaseChoices").innerHTML,sameDay.node("releaseChoices").innerHTML);
    assert.notEqual(first.node("dailyRoutineName").textContent,nextDay.node("dailyRoutineName").textContent);
    assert.notEqual(first.node("visualizeTitle").textContent,nextDay.node("visualizeTitle").textContent);
    assert.notEqual(first.node("breatheTitle").textContent,nextDay.node("breatheTitle").textContent);
    assert.notEqual(first.node("releaseChoices").innerHTML,nextDay.node("releaseChoices").innerHTML);
});
test("unsupported speech remains usable through explicit reading",()=>{
    const storage=createStorage(backingStore());storage.bind(1);const flow=practice(storage,{value:"2026-10-05"});flow.node("visualizeDoneBtn").disabled=true;flow.node("visualizePlayBtn").click();assert.match(flow.node("visualizeStatus").textContent,/not available/);assert.equal(flow.node("visualizeDoneBtn").disabled,true);flow.node("visualizeReadBtn").click();assert.equal(flow.node("visualizeDoneBtn").disabled,false);
});
test("legacy saved-plan details cannot reintroduce mandatory tools or games",()=>{
    const source=fs.readFileSync(path.join(__dirname,"../public/js/welcome.js"),"utf8");const start=source.indexOf("function appendPlanCoachingDetails(");const end=source.indexOf("function createWaitingCard(",start);const headings=new Map();const context=vm.createContext({document:{createElement:()=>({appendChild(){}})},appendPlanParagraphs:(body,title,values)=>headings.set(title,values)});vm.runInContext(source.slice(start,end),context);context.appendPlanCoachingDetails({appendChild(){}},{daySummary:["Useful focus"],whatToDo:["Finish all four tools and the mandatory game."],youAreDoneWhen:"Play the required game.",sportTryIt:["Breathe at practice."],thinkAboutIt:["Next play."]});assert.equal(headings.get("Step-by-Step Help").length,3);assert.deepEqual(Array.from(headings.get("You Are Done When")),["Finish today's three guided steps. The game is optional."]);
});
