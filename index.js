// https://oauth.vk.com/authorize?client_id=5550899&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=4098&response_type=token&v=5.52&state=4itProductions
// https://{$server}?act=a_check&key={$key}&ts={$ts}&wait=25&mode=2 
var https = require('https');
var querystring = require('querystring');
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
if (![].includes) {//Полифилл Array.prototype.includes()
	Array.prototype.includes = function(searchElement/*, fromIndex*/) {
		'use strict';
		var O = Object(this);
		var len = parseInt(O.length) || 0;
		if (len === 0) {
			return false;
		}
		var n = parseInt(arguments[1]) || 0;
		var k;
		if (n >= 0) {
			k = n;
		} else {
			k = len + n;
			if (k < 0) {
				k = 0;
			}
		}
		while (k < len) {
			var currentElement = O[k];
			if (searchElement === currentElement ||
				(searchElement !== searchElement && currentElement !== currentElement)
			) {
				return true;
			}
			k++;
		}
		return false;
	};
}

var AnswerMachine = function(token){
	this.token = token;
	this.longPollServer = {};
	this.lastLongPollQueryDate = new Date();
	this.answerers = {};
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
			that.lastLongPollReq.end();
			that.sendLongPoll();
		})
		.setTimeout(30000);
	}
	this.getLongPollServer();

	
	var that = this;
	function checkHealth(){
		if (Date.now() - that.lastLongPollQueryDate.getTime() > 1000*60*2){
			console.error(now(), 'WARNING:', 'failRestart');
			that.lastLongPollReq.abort();
			that.getLongPollServer();
		}
	}
	this.failRestartTimer = setInterval(checkHealth, 1000*60);//Чинит скрипт, если все плохо.


	this.friends = [];
	this.getFriends = function(){
		console.log(now(), 'update friends');
		var that = this;
		https.get('https://api.vk.com/method/friends.get?access_token='+this.token+'&v=5.52', function(res){
			var body = '';
			res.on('data', function(chunk){
				body+=chunk;
			});
			res.on('end', function(){
				body = JSON.parse(body);
				if (body.response){
					console.log(now(), 'Friends loaded', body.response.count);
					that.friends = body.response.items;
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
	this.getFriends();
	this.updateFriendsUpdateTimer = setInterval(this.getFriends, 1000*60*60);


	this.sendMessage = function(user_id, message){
		message = querystring.escape(message);
		console.log(now(), 'sendMessage');
		var that = this;
		var query = 'https://api.vk.com/method/messages.send?user_id='+user_id
				+'&message='+message
				+'&access_token='+this.token
				//+'&random_id='+uuid.v4()
				+'&v=5.52';
		https.get(query, function(res){
			var body = '';
			res.on('data', function(chunk){
				body+=chunk;
			});
			res.on('end', function(){
				body = JSON.parse(body);
				if (!body.response){
					console.error('sendMessageError',body);
				}
			});	
		})
		.on('error', function(e) {
			console.error('sendMessageError',e);
		});
	}

	this.processMessage = function(message){
		var msg = {
			message_id: message[1],
			flags: {},
			from_id: message[3],
			timestamp: message[4],
			subject: message[5],
			text: message[6]
		};
		msg.flags.MEDIA = (message[2]/512 >= 1);
		message[2]%=512;
		msg.flags.FIXED = (message[2]/256 >= 1);
		message[2]%=256;
		msg.flags.DELЕTЕD = (message[2]/128 >= 1);
		message[2]%=128;
		msg.flags.SPAM = (message[2]/64 >= 1);
		message[2]%=64;
		msg.flags.FRIENDS = (message[2]/32 >= 1);
		message[2]%=32;
		msg.flags.CHAT = (message[2]/16 >= 1);
		message[2]%=16;
		msg.flags.IMPORTANT = (message[2]/8 >= 1);
		message[2]%=8;
		msg.flags.REPLIED = (message[2]/4 >= 1);
		message[2]%=4;
		msg.flags.OUTBOX = (message[2]/2 >= 1);
		message[2]%=2;
		msg.flags.UNREAD = (message[2]/1 >= 1);
		message[2]%=1;

		console.log(msg);
		if (!msg.flags.OUTBOX && !that.friends.includes(msg.from_id) && !msg.flags.FRIENDS && msg.from_id<2000000000){
			console.log('process');
			if (!(msg.from_id in this.answerers)){
				this.answerers[msg.from_id] = new Answerer();
			}
			var answer = this.answerers[msg.from_id].getAnswer(msg);
			if (answer){
				this.sendMessage(msg.from_id, answer);
			}
			console.log(answer || 'no answer');
		}
	}
	

}
function Answerer(){
	this.headerText = 'vkAnswerMachine:';
	this.header = this.headerText +'\n';
	this.messages = [];
	this.isStop = false;
	this.lastAnswer = '';
	this.getAnswer = function(msg){
		if (msg.text.indexOf(this.headerText) != 0){
			if (msg.text == '/restart'){
				this.lastAnswer = '';
				this.isStop = false;
				this.clearMessages();
				this.lastAnswer = this.header
					+'Автоответчик перезапущен.';
				return this.lastAnswer;
			}
			else if (msg.text == '/stop'){
				this.isStop = true;
				this.lastAnswer = this.header
					+'А';
					//+'Автоответчик остановлен.';
				return this.lastAnswer;
			}
			else if (!this.isStop){
				if (this.messages.length == 0){
					this.messages.push(msg);
					this.lastAnswer = 'vkAnswerMachine by 4it.me\n\n'
						+'Вас приветствует автоответчик\n'
						+'Если вы хотите мне что то продать, введите 1\n'
						+'Если вы хотите попросить денег, введите 2\n'
						+'Если у вас есть вопрос, введите 3\n'
						+'Если вы просто хотите пообщаться, введите 4\n';
					return this.lastAnswer;
				}
				else if (msg.text == '1'){
					this.clearMessages();
					this.lastAnswer = this.header
						+'Мне ничего не нужно, идите нахер';
					return this.lastAnswer;
				}
				else if (msg.text == '2'){
					this.clearMessages();
					this.lastAnswer = this.header
						+'Денег я не дам, идите нахер';
					return this.lastAnswer;
				}
				else if (msg.text == '3'){
					this.isStop = true;
					this.lastAnswer = this.header
						+'Напишите подробно, о чем вы хотите спросить. Вопросы типа "а можно ли задать вопрос?" не принимаются. Ждите ответа.';
					return this.lastAnswer;
				}
				else if (msg.text == '4'){
					this.clearMessages();
					this.lastAnswer = this.header
						+'Я вам не верю, идите нахер';
					return this.lastAnswer;
				}
			}
		}
		return '';
	};
	this.clearMessages = function(){
		this.messages = [];
	}
}
var answerMachine = new AnswerMachine(config.token);