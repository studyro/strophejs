
var Openfire = {};

/** Class Openfire.WebSocket
  * This class manages a WebSockets connection to Openfire server which using
  * websockets plugin.
  * 
  * Most APIs here are similar to those in Strophe.Websocket
  */

Openfire.Websocket = function(connection) {
    this._conn = connection;
    
    var service = connection.service;
    if (service.indexOf("ws:") !== 0 && service.indexOf("wss:") != 0) {
        // If the service is not an absolute URL, assume it is a path and put the absolute
        // URL together from options, current URL and the path.
        var new_service = "";
        
        if (connection.options.protocol === "ws" && window.location.protocol !== "https:") {
            new_service += "ws";
        } else {
            new_service += "wss";
        }
        
        new_service += "://" + window.location.host;
        
        if (service.indexOf("/") !== 0) {
            new_service += window.location.pathname + service;
        } else {
            new_service += service;
        }
        
        connection.service = new_service;
    }
    
    console.log("service: " + connection.service);
};

Openfire.Websocket.prototype = {
    
    _reset: function() {
        return;
    },
    
    _disconnect: function(pres) {
        if (pres) {
            this._conn.send(pres);
        }
        
        this._conn._doDisconnect();
    },
    
    _doDisconnect: function ()
    {
        Strophe.info("WebSockets _doDisconnect was called");
        this._closeSocket();
    },
    
    _closeSocket: function ()
    {
        if (this.socket) { 
            try {
                this.socket.close();
            } catch (e) {} 
        }
        this.socket = null;
    },
    
    _connect_cb: function(bodyWrap) {
        return null;
    },
    
    _connect: function() {
        // Ensure there is no open WebSocket from a previous Connection.
        this._closeSocket();
        
        var username = Strophe.getBareJidFromJid(this._conn.jid);
        var password = this._conn.pass;
        var resource = Strophe.getResourceFromJid(this._conn.jid);
        
        // The websocket connection manager in Openfire need to deliver authentication info in url.
        var url = this._conn.service + "server?username=" + username + "&password=" + password + "&resource=" + resource;
        
        this.socket = new WebSocket(url, "xmpp");
        this.socket.onopen = this._onOpen.bind(this);
        this.socket.onerror = this._onError.bind(this);
        this.socket.onclose = this._onClose.bind(this);
        this.socket.onmessage = this._onMessage.bind(this);
    },
    
    _onIdle: function () {
        // send all queued stanzas.
        var data = this._conn._data;
        if (data.length > 0 && !this._conn.paused) {
            for (i = 0; i < data.length; i++) {
                if (data[i] !== null) {
                    var stanza, rawStanza;
                    
                    stanza = data[i];
                    rawStanza = Strophe.serialize(stanza);
                    
                    this._conn.xmlOutput(stanza);
                    this._conn.rawOutput(rawStanza);
                    this.socket.send(rawStanza);
                }
            }
            this._conn._data = [];
        }
    },
    
    _onOpen: function() {
        Strophe.info("Websocket open");
        this._conn._connected_of();
        
        // keep alive ping.
        var scopedThis = this;
        this.interval = setInterval(function() {
            scopedThis._sendRaw(" ");
        }, 10000);
    },
    
    _onClose: function() {
        clearInterval(this.interval);
        this.interval = null;
        
        if (this._conn.connected && !this._conn.disconnecting) {
            Strophe.error("Websocket closed unexpectedly");
            this._conn._doDisconnect();
        } else {
            Strophe.info("Websocket closed");
        }
    },
    
    _onError: function() {
        Strophe.error("Websocket error " + error);
        this._conn._changeConnectStatus(Strophe.Status.CONNFAIL, "The WebSocket connection could not be established was disconnected.");
        this._disconnect();
    },
    
    _onMessage: function(message) {
        var elem;
        
        try {
            elem = this._textToXML(message.data);
        } catch (e) {
            if (e != "parseerror") { throw e; }
            // TODO: disconnect with reason parse error.
        }
        
        this._conn._dataRecv(elem, message.data);
    },
    
    _textToXML: function(text) {
        var doc = null;
        
        if (window['DOMParser']) {
            var parser = new DOMParser();
            doc = parser.parseFromString(text, 'text/xml');
        } else if (window['ActiveXObject']) {
            var doc = new ActiveXObject("MSXML2.DOMDocument");
            doc.async = false;
            doc.loadXML(text);
        } else {
            throw Error('No DOMParser object found.');
        }
        
        return doc.firstChild;
    },
    
    _reqToData: function(stanza) {
        return stanza;
    },
    
    // send raw text, here we use it to keep alive.
    _sendRaw: function(text) {
        if(!this._conn.connected || this.socket == null) {
            throw Error("Not connected, cannot send packets.");
        }
        
        if (text != " ") {
            this._conn.xmlOutput(this._textToXML(text));
            this._conn.rawOutput(text);
        }
        
        this.socket.send(text);
    },
    
    _send: function() {
        this._conn.flush();
    },
    
    _sendRestart: function() {
        clearTimeout(this._conn._idleTimeout);
        this._conn._onIdle.bind(this._conn)();
    },
};