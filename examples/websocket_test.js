var WS_SERVICE = 'ws://127.0.0.1:7070/ws/'
var connection = null;

function log(msg) 
{
    $('#log').append('<div></div>').append(document.createTextNode(msg));
}

function rawInput(data)
{
    log('RECV: ' + data);
}

function rawOutput(data)
{
    log('SENT: ' + data);
}

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
    log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
    log('Strophe failed to connect.');
    $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
    log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
    log('Strophe is disconnected.');
    $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
    log('Strophe is connected.');
    connection.send($pres());
    }
}

$(document).ready(function () {
    connection = new Strophe.Connection(WS_SERVICE, {backend: "Openfire"});
    connection.rawInput = rawInput;
    connection.rawOutput = rawOutput;

    $('#connect').bind('click', function () {
    var button = $('#connect').get(0);
    if (button.value == 'connect') {
        button.value = 'disconnect';

        connection.connect($('#jid').get(0).value,
                   $('#pass').get(0).value,
                   onConnect);
    } else {
        button.value = 'connect';
        connection.disconnect();
    }
    });
});