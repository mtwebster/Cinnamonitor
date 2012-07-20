const Applet = imports.ui.applet;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Cinnamon = imports.gi.Cinnamon;
const GTop = imports.gi.GTop;



function MyApplet(orientation) {
    this._init(orientation);
}


MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {        
        Applet.TextIconApplet.prototype._init.call(this, orientation);
        
        try {                 
            this.set_applet_icon_symbolic_name('utilities-system-monitor-symbolic');
            this._orientation = orientation;
            
        }
        catch (e) {
            global.logError(e);
        }
    },

    on_applet_clicked: function(event) {
        
    },
    
    on_orientation_changed: function (orientation) {
        this._orientation = orientation;
        // this._initContextMenu();
    }
};

function main(metadata, orientation) {  
    let myApplet = new MyApplet(orientation);
    return myApplet;      
}
