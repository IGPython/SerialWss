const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const SerialPort = require('serialport');
const yaml = require('js-yaml')
// Webserver Requires
// var express = require('express');
// var app = express();

// Load Settongs from Config File

try {
    let fileContents = fs.readFileSync('./settings/config.yaml', 'utf8');
    var settings = yaml.safeLoad(fileContents);

    console.log(settings);
} catch (e) {
	console.log("Unable to read settings file.")
    console.log(e);
}

// Consider Creating a Secure WebSocket if keys are generated??
const wss = new WebSocket.Server({ port: settings.wsPortNo });
//Create a SSL Certificate for Use 

// var selfsigned = require('selfsigned');


// var pems = selfsigned.generate(null, {
//   name: 'localhost',
//   keySize: 2048, // the size for the private key in bits (default: 1024)
//   days: 365 * 10, // how long till expiry of the signed certificate (default: 365)
//   algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
//   extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
//   pkcs7: true, // include PKCS#7 as part of the output (default: false)
//   clientCertificate: false, // generate client cert signed by the original key (default: false)
//   clientCertificateCN: 'jdoe' // client certificate's common name (default: 'John Doe jdoe123')
// });

// // Set the key Values

// var key = pems.private;
// var cert = pems.cert;
// var ca = pems.public;
// var options = {
//   key: key,
//   cert: cert,
//   ca: ca
// };

// https.createServer(options, app).listen(443);
//console.log(pems.cert);
//console.log(pems.private);
//console.log(pems);
//const server = https.createServer({
 // cert: pems.cert,
 // key: pems.private
//});
//const wss = new WebSocket.Server({ server });
//server.listen(8080);

// create a webserver for the congig and accepting Self Signed certificates


var config = {
	portNumber: "COM1",
	baudRate: 9600,
	dataBits: 8,
	stopBits: 1,
	parity: "none"
};
var w = "err";
var begin_read = 0
var Readline = SerialPort.parsers.Readline
var portOpen = 0
var sending = 0
var port
var alibi = ""

// Standard Functions 
// open the requored connection serial or IP here 
if(settings.scale1SerialConnection == true){
	console.log("creating Serial Port")
	createSerialPort();

}else{
	// Create a Network Connection Instead as Serial is False
	createNetworkPort();
}


// Create a Moc Binding for testing

//const MockBinding = require('@serialport/binding-mock')

//SerialPort.Binding = MockBinding

function noop() {}

function heartbeat() {
	this.isAlive = true;
}

//Create and open the port as it is not opened
function createSerialPort(){
	//MockBinding.createPort('/dev/TEST', { echo: true, record: true });
	//console.log("creating port .......");

	 port = new SerialPort(settings.scale1ComPort, {
		baudRate: parseInt(settings.scale1BaudRate, 10),
		dataBits: parseInt(settings.scale1DataBits, 10),
		stopBits: parseInt(settings.scale1StopBits, 10),
		parity: settings.scale1Parity
		}, function (err){
			if (err){

			console.log("Error: ", err.message);
			// try to close the port throws error so leave it :)
			//port.close();
			w = err.message
			portOpen = 0;
			return
			}	
		});
	 portOpen = 1;
};

function createNetworkPort(){
	//function to connect to RAW Ports
	//Add error to reconnect if network goes down
	console.log("Using Network Serial is Off!!")
}

function readData(){
	sending = 1; // Pause Sending
	reply = port.read();
	//console.log("Reply Raw is: " + reply) 
	if(reply){
		w = reply.toString()
		console.log("Received:" + w);
		sending = 0;
	}
}

function readAlibiData(){
	sending = 1; // Pause Sending
	reply = port.read();
	//console.log("Reply Raw is: " + reply) 
	if(reply){
		alibi = reply.toString()
		console.log("Received:" + alibi);
		sending = 0;
	}
}

function senddata(){

	//console.log(settings.scale1WeightRequest)
	 //req = settings.scale1WeightRequest + '\r\n'
	 if(settings.scale1AppendCR == true){
			req = settings.scale1WeightRequest + '\r\n'

		}else{
			req = settings.scale1WeightRequest 

		}
	if(sending == 0){
		port.write(req,  function(err, callback) {
			sending = 1;
			if (err) {
				return console.log('Error on write: ', err.message)
			}
			//console.log('Serial Data Sent: ' + config.requestChr)
			readData(callback);
			sending =0 ;
			

		})	

	}
}

function getAlibi(){
	if(settings.scale1AppendCR == true){
		areq = settings.scale1AlibiRequest + '\r\n'

	}else{
		areq = settings.scale1AlibiRequest 

	}
	if(sending == 0){
		console.log("Reading Alibi");
		port.write(areq,  function(err, callback) {
			sending = 1;
			if (err) {
				return console.log('Error on Alibi write: ', err.message)
			}
			//console.log('Serial Data Sent: ' + config.requestChr)
			readAlibiData(callback);
			sending =0 ;
			

		})	

	}
}


setInterval(function(){ 
	if( sending != 1){
    	senddata();
    	}
	}, 500);


// Build the WebSocket Server to get the weight data to the UI

wss.on('connection', function connection(ws) {
	 ws.isAlive = true;
     ws.on('pong', heartbeat);

	ws.on('message', function incoming(message) {
		config = JSON.parse(message);
		if(config.getalibi == true){
			getAlibi
			ws.send(alibi)
			alibi = ""

		}else{
		//console.log(config);
				ws.send(w);
		}
		
		

	});


	ws.on('close', function() {
    	console.log('closing connection');
    	
    	
  	});


});

const interval = setInterval(function ping(){
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping(noop);
	});

}, 3000);
