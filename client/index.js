﻿var common = require("common"); //code that is common to server and client
var fs = require('fs');
var raspicam = require('raspicam');
var exec = require("child_process").exec;

//read server address from config
var serverUrl = "http://192.168.1.5:1337";
var imageFolderName = "images";

var io = require('socket.io-client')(serverUrl, {
    query: "type=cameraClient"
}); //options are ommited, server tries connection and reconnection in intervals automatically

var clientData = {
};

io.on("connect", function (socket,a,b)
{
	console.log("Connected to server!");
});



//server tells me to take image!
io.on(common.EVENT_TYPES.TAKE_IMAGE, function (data) {
    console.log("Received server command: take image");
    takeImage(data, function (imageFilename) {
		console.log("preparing SEND_IMAGE event");
        var image = fs.readFileSync(imageFilename);
        var str = image.toString('base64');
        io.emit(common.EVENT_TYPES.SEND_IMAGE, { image: str, setIndex: data.setIndex }); //server sends us a set index so it knows which set of images the currently set image belongs to. we send it back.
		console.log("sending response to server for image set " + data.setIndex);
	});

	
});

//server tells me to update git repository
io.on(common.EVENT_TYPES.GIT_PULL, function (data) {
	var cmd = "git pull origin master";
	exec(cmd);
	});

//sends an error string to the server
function serverError(string) {
    io.emit(common.EVENT_TYPES.ERROR, { message: string });
}


//takes an image using the pi cam and calls the given callback on success
//callback arguments are (imagefilename)
function takeImage(data, callback) {
    /*callback(imageFolderName + "/test.jpg");
	return; */
	console.log("Debug: " + data.photoOptions.width + " " + data.photoOptions.height);
    var camera = new raspicam({
        mode: "photo",
        output: imageFolderName + "/%d.jpg",
		timeout: 1,
		nopreview: true,
		ex: "fireworks",
		width: data.photoOptions.width || 640,
		height: data.photoOptions.height || 480
    });
	
	var readEvent = function(thisArg, error, filename) 
	{
		console.log("read event for filename: " + filename);
	        var filenameStr = imageFolderName + "/" + filename;
			if(filenameStr.charAt(filenameStr.length-1) !== "~"){
				callback(filenameStr);
				camera.removeListener("read",readEvent);
				console.log("removed listener. total read listeners: " + camera.listeners("read").length);
				camera.stop();
			}   
	}
	
	var startEvent = function()
	{
		console.log("start event triggered!");
	}
	
	var endEvent = function()
	{
		console.log("end event triggered!");
	}
	
    camera.on("read", readEvent );
	camera.on("start",startEvent);
	camera.on("exited",endEvent);
    camera.start();
}
