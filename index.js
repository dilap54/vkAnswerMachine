// https://oauth.vk.com/authorize?client_id=5550899&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=messages&response_type=token&v=5.52&state=4itProductions
// https://{$server}?act=a_check&key={$key}&ts={$ts}&wait=25&mode=2 
var https = require('https');
var config = require('./config.js');
function now(){
	var now = new Date();
    return	now.getDate()+"."+
			String(now.getMonth()+1)+"."+
			now.getFullYear()+" "+
			now.getHours()+":"+
			now.getMinutes()+":"+
			now.getSeconds()+"."+
			now.getMilliseconds();
}
var AnswerMachine = function(token){
	this.token = token;
	this.longPollServer = {};
	this.lastLongPollQueryDate = new Date();
	this.getLongPollServer = function(){
		console.log(now(), 'getLongPollServer');
		var that = this;
		https.get('https://api.vk.com/method/messages.getLongPollServer?use_ssl=1&access_token='+this.token+'&v=5.52', function(res){
			var body = '';
			res.on('data', function(chunk){
				body+=chunk;
			});
			res.on('end', function(){
				body = JSON.parse(body);
				if (body.response){
					console.log('body', body);
					that.longPollServer = body.response;
					that.sendLongPoll();
				}
				else{
					console.error('body', body);
				}
			});	
		})
		.on('error', function(e) {
			console.error(e);
		});
	}
	this.sendLongPoll = function(){
		console.log(now(), 'sendLongPoll');
		var that = this;
		this.lastLongPollQueryDate = new Date();
		this.lastLongPollReq = https.get('https://'+this.longPollServer.server+'?act=a_check&key='+this.longPollServer.key+'&ts='+this.longPollServer.ts+'&wait=25', function(res){
			var body = '';
			res.on('data', function(chunk){
				body+=chunk;
			});
			res.on('end', function(){
				body = JSON.parse(body);
				if (body.updates){
					that.longPollServer.ts = body.ts;
					//console.log(body);
					body.updates.forEach(function(item){
						if (item[0] == 4){
							that.processMessage(item);
						}
					});
					that.sendLongPoll();
				}
				else if(body.failed == 2 || body.failed == 3){
					console.log(now(), body);
					that.getLongPollServer();
				}
				else{
					console.error('bodyErr', body);
				}
			});	
		})
		.on('error', function(e) {
			console.error(e);
		})
		.on('timeout', function(){
			console.error(now(), 'longPollReq timeout');
			that.sendLongPoll();
		})
		.setTimeout(30000);
	}
	this.getLongPollServer();

	//fail restart
	var that = this;
	function checkHealth(){
		if (Date.now() - that.lastLongPollQueryDate.getTime() > 1000*60*2){
			console.error(now(), 'WARNING:', 'failRestart');
			that.lastLongPollReq.abort();
			that.getLongPollServer();
		}
	}
	this.failRestartTimer = setInterval(checkHealth, 1000*60);

	this.processMessage = function(message){
		var msg = {
			message_id: message[1],
			flags: message[2],
			from_id: message[3],
			timestamp: message[4],
			subject: message[5],
			text: message[6]
		}
		console.log(msg);
	}


}

var answerMachine = new AnswerMachine(config.token);