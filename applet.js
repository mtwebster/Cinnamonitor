const Applet = imports.ui.applet;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Cinnamon = imports.gi.Cinnamon;
const GTop = imports.gi.GTop;

const REFRESH_RATE = 1000;
const FLAT_RANGE = 5; // (+/- xx kb/min)


const MB = 1048576;
const KB =    1024;
const MINUTE = 60000;

function MyApplet(orientation) {
    this._init(orientation);
}


MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,

    _init: function(orientation) {        
        Applet.TextIconApplet.prototype._init.call(this, orientation);
        
        // Unless we hard-code a width, the applet will change its width dynamically,
        // as the width of the displayed data changes.
        this.actor.width = 100; // heuristically determined value
        // Make label less prominent.
        this._applet_label.set_style("font-weight: normal;");
        
        this._orientation = orientation;
        this.cinnamonMem = new CinnamonMemMonitor();
        this.initialTime = new Date();
    },

    _pulse: function() {
        if (this.stopped) return;

        this.cinnamonMem.update();
        let now = new Date();
        let elapsed = (now.getTime() - this.initialTime.getTime()) / MINUTE; // get elapsed minutes
        let delta = this.cinnamonMem.getDiffKb() / elapsed;
        let ttip;
        if (delta > FLAT_RANGE) {
            ttip = "+" + delta.toFixed(2) + "k/min\n";
        } else if (delta < -FLAT_RANGE) {
            ttip = delta.toFixed(2) + "k/min\n";
        } else {
            ttip = "flat\n";
        }
        ttip += "-------\n";
        ttip += "Start: " + this.cinnamonMem.getStartMb().toFixed(2) + "m\n";
        ttip += "Diff: " + this.cinnamonMem.getDiffMb().toFixed(2) + "m\n";
        let time = secondsToTime(elapsed * 60);
        ttip += "Elapsed: " + time.h + ":" + time.m + ":" + time.s + "\n";
        ttip += "Acc. Cinnamon CPU%: " + (this.cinnamonMem.getCinnamonAccumulatedCpuUsage()*100).toPrecision(3) + "\n";
        ttip += "Acc. Total CPU%: " + (this.cinnamonMem.getTotalAccumulatedCpuUsage()*100).toPrecision(3) + "\n";
        ttip += "-------\n";
        ttip += "click to reset";

        let curMb = this.cinnamonMem.getCurMb().toFixed(2);
        let cpuUsage = (this.cinnamonMem.getCpuUsage()*100).toPrecision(2);
        
        let label = " " + curMb + "m, " + cpuUsage + "%";
        this.set_applet_label(label);

        this.set_applet_tooltip(ttip);
        Mainloop.timeout_add(REFRESH_RATE, Lang.bind(this, this._pulse));
    },

    on_applet_added_to_panel: function() {
        this.stopped = false;
        this._pulse();
    },

    on_applet_removed_from_panel: function(event) {
        this.stopped = true;
    },

    on_applet_clicked: function(event) {
        this.cinnamonMem.resetStats();
        this.initialTime = new Date();
    },
    
    on_orientation_changed: function (orientation) {
        this._orientation = orientation;
        // this._initContextMenu();
    }
};

function CinnamonMemMonitor() {
    this._init();
}

CinnamonMemMonitor.prototype = {

    _init: function() {
        try {
            this.pid = global.get_pid();
            this.procMem = new GTop.glibtop_proc_mem();
            this.procTime = new GTop.glibtop_proc_time();
            this.gtop = new GTop.glibtop_cpu();

            this.resetStats();
        } catch (e) {
            global.logError(e);
        }
    },

    update: function() {
        GTop.glibtop.get_proc_mem(this.procMem, this.pid);
        this.lastRtime = this.procTime.rtime;
        this.lastTick = this.gtop.total;
        GTop.glibtop.get_proc_time(this.procTime, this.pid);
        GTop.glibtop_get_cpu(this.gtop);
    },
    
    getCpuUsage: function() {
        let delta = this.procTime.rtime - this.lastRtime;
        let tickDelta = this.gtop.total - this.lastTick;
        return tickDelta ? delta/tickDelta : 0;
    },

    getCinnamonAccumulatedCpuUsage: function() {
        let delta = this.procTime.rtime - this.startRtime;
        let tickDelta = this.gtop.total - this.startTicks;
        return tickDelta ? delta/tickDelta : 0;
    },

    getTotalAccumulatedCpuUsage: function() {
        let delta = this.gtop.idle - this.startIdle;
        let tickDelta = this.gtop.total - this.startTicks;
        return 1 - (tickDelta ? delta/tickDelta : 0);
    },

    getCurMb: function() {
        return this.procMem.resident/MB;
    },

    getStartMb: function() {
        return this.startMem/MB;
    },

    getDiffMb: function() {
        return (this.procMem.resident - this.startMem)/MB;
    },

    getDiffKb: function() {
        return (this.procMem.resident - this.startMem)/KB;
    },

    resetStats: function() {
        this.update();
        this.startMem = this.procMem.resident;
        this.startRtime = this.procTime.rtime;
        this.startTicks = this.gtop.total;
        this.startIdle = this.gtop.idle;
    }
};

function main(metadata, orientation) {  
    let myApplet = new MyApplet(orientation);
    return myApplet;      
}


function secondsToTime(secs)
{
    let hours = Math.floor(secs / (60 * 60));
    let divisor_for_minutes = secs % (60 * 60);
    let minutes = Math.floor(divisor_for_minutes / 60);

    let divisor_for_seconds = divisor_for_minutes % 60;
    let seconds = Math.floor(divisor_for_seconds);
    let obj = {
            "h": hours,
            "m": minutes < 10 ? "0" + minutes: minutes,
            "s": seconds < 10 ? "0" + seconds: seconds
    };
    return obj;
}
