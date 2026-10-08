"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const vm=require("node:vm");const fs=require("node:fs");const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../public/js/account-bootstrap.js"),"utf8");
async function bootstrap(identity, pathname="/welcome.html") {
    const events={};const loaded=[];let bound=null;let reloads=0;let redirect=null;const removed=[];
    const sources=[{type:"",getAttribute:()=>"js/app-time.js"},{type:"module",getAttribute:()=>"main.js"}];
    const storage={bind:id=>{bound=id??null;},account:()=>bound};
    const context=vm.createContext({window:{MindZoneStorage:storage,addEventListener:(event,fn)=>{events[event]=fn;}},location:{pathname,replace:url=>{redirect=url;},reload:()=>{reloads++;}},sessionStorage:{removeItem:key=>removed.push(key)},localStorage:{setItem(){}},fetch:async()=>identity.value===null?{ok:false,status:401}:{ok:true,json:async()=>({id:identity.value})},document:{querySelectorAll:()=>sources,createElement:()=>({}),body:{appendChild(script){assert.equal(bound,identity.value);loaded.push(script.src);script.onload();},prepend(){}}}});
    await vm.runInContext(source,context);
    return {context,events,loaded,removed,get bound(){return bound;},get reloads(){return reloads;},get redirect(){return redirect;}};
}
test("verified account loads dependent classic and module scripts in order",async()=>{const fixture=await bootstrap({value:12});assert.deepEqual(fixture.loaded,["js/app-time.js","main.js"]);assert.equal(fixture.bound,12);});
test("anonymous practice redirects before loading private state",async()=>{const fixture=await bootstrap({value:null},"/daily-session.html");assert.equal(fixture.redirect,"/auth.html");assert.deepEqual(fixture.loaded,[]);});
test("sibling login in another tab invalidates the old account before reload",async()=>{const identity={value:1};const fixture=await bootstrap(identity);identity.value=2;await fixture.events.focus();assert.equal(fixture.bound,null);assert.equal(fixture.reloads,1);assert.ok(fixture.removed.includes("mindzone_pending_weekly_reflection"));});
test("logout event disables writes and clears per-tab login flags",async()=>{const fixture=await bootstrap({value:1});fixture.events.storage({key:"mindzone_session_changed"});assert.equal(fixture.bound,null);assert.equal(fixture.reloads,1);assert.ok(fixture.removed.includes("mindzone_after_login"));});
