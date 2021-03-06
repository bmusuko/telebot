#! /usr/bin/node

// imports
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const mysql = require('mysql');
const qs = require('querystring')
const snoowrap = require('snoowrap');


// env
const token = process.env.TBTOKEN;
const dbuser = process.env.TBDBUSER;
const dbpwd = process.env.TBDBPWD;
const dbname = process.env.TBDB;
const REDDITCLIENTID = process.env.REDDITCLIENTID;
const REDDITCLIENTSECRET = process.env.REDDITCLIENTSECRET;
const REDDITREFRESHTOKEN = process.env.REDDITREFRESHTOKEN;
const BANNEDUSERID = process.env.BANNEDUSERID;
const opts = {
	parse_mode: 'Markdown'
};

// constants
const internalError = "Something went wrong :("


// bot and db setup 
const bot = new TelegramBot(token, {polling: true});

const dbConn = new mysql.createConnection({
	host: "localhost",
	user: dbuser,
	password: dbpwd,
	database: dbname
});

dbConn.connect();


const snoo = new snoowrap({
		userAgent : "fatt",
		clientId : REDDITCLIENTID,
		clientSecret : REDDITCLIENTSECRET,
		refreshToken : REDDITREFRESHTOKEN
});



// actual features

bot.onText(/\/help/, (msg, match) => {

	const chatId = msg.chat.id;
	const resp = `Help
	- /nim [query], itb nim finder
	- /echo [msg], echo.. literally
	- /whoami , shows who you really are
	- /cheat [card] [card] [card] [card] , cheat in 24 solver
	- /tag [tag_name], show tagged image
	- /tagowner [tag_name], get tag_owner
	- /addtag [tag_name] [link], tag an image
	- /taglist, show all tags,
	- /deletetag [tag_name], delete tag
	- /showevent [-p || -g], show events, use flag -p to show your private event and -g for global
	- /addevent [event_name] [event_time], add event
	- /random , get a random meme from r/dankmemes
	- /r [subreddit_name], get a post from a subreddit
	- /short [real_link] [custom_link], short a link with a custom link
	`;


	bot.sendMessage(chatId, resp);

});

bot.onText(/\/fuck (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	var respList = ['I know right', `yeah, fuck ${match[1]}`, 'damn right']
	const resp = respList[Math.floor(Math.random()*(respList.length))];

	bot.sendMessage(chatId, resp);
});


bot.onText(/\/echo (.*)/, (msg, match) => {

	const chatId = msg.chat.id;
	const resp = match[1];
	
	bot.sendMessage(chatId, resp);

});
	


bot.onText(/\/whoami/, (msg, match) => {

	const chatId = msg.chat.id;
	const userId = msg.from.id;
	const username = msg.from.username;
	const firstname = msg.from.first_name;

	const resp = `you are user ${userId} @${username} or should i call you ${firstname}`;

	bot.sendMessage(chatId, resp);

});

bot.onText(/\/nim (.*)/, (msg, match) => {

	const chatId = msg.chat.id;
	var resp = '';

	// console.log(`someone wants to findout who is ${match[1]}`);

	axios.get(`http://127.0.0.1:6969/get/nim/${match[1]}`)
	.then((res) => {
		if (res.data.count === 0) {
			resp = res.data.message;
		} else {
			for (let i = 0; i < 10 && i < res.data.count; i++) {
				
				let data = res.data.data[i];

				let nama = data.nama;
				let jurusan = data.jurusan;
				let fakultas = data.fakultas;
				let tpb = data.tpb;
				let s1 = data.s1;

				resp += `${nama} ${tpb} ${s1 !='NULL'?s1:''} ${fakultas} ${jurusan}\n`
			}
		}
		if (res.data.count > 10 || res.data.count === 0) {
			resp += `\nto show more use /nim -a [query]`;
		}

		bot.sendMessage(chatId, resp);
	})
	.catch((err) => {
		console.log(err);
		bot.sendMessage(chatId, internalError);
	});

	

});


bot.onText(/\/cheat (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	var resp = '';

	var nums = match[1].split(' ');
	// console.log(nums);
	axios.get(`http://127.0.0.1:6969/24solver/${nums[0]}/${nums[1]}/${nums[2]}/${nums[3]}`)
	.then((res) => {
		let d = res.data;
		resp += `${d.message}\n`;
		resp += `${d.count === 0?'':d.data[0]}`;

		bot.sendMessage(chatId, resp);
	})
	.catch((err) => {
		console.log(err)
		bot.sendMessage(chatId, internalError);
	})

	
});


bot.onText(/\/showevent (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	const event_owner = msg.from.id;

	if (match[1].match(/-p/)) {

		dbConn.query("SELECT * FROM event WHERE event_owner = ?", event_owner, 
			(err, results, field) => {
				if (err) {
					bot.sendMessage(chatId, internalError);
				} else if (results.length) {
					var resp = "";

					results.forEach(r => {
						resp += `${r.event_name} ${r.event_time}\n`;
					});

					bot.sendMessage(chatId, resp);
				} else {
					bot.sendMessage(chatId, "no events found");
				}
			});

	} else {

		dbConn.query("SELECT * FROM event WHERE event_owner = ?", "PUBLIC",
			(err, results, field) => {
				if (err) {
					bot.sendMessage(chatId, internalError);
				} else if (results.length) {
					console.log(results);
					var resp = "";
					results.forEach(r => {
						resp += `${r.event_name} ${r.event_time}\n`;
					});

					bot.sendMessage(chatId, resp);
				} else {
					bot.sendMessage(chatId, "no events found");
				}
			});

	}


});


bot.onText(/\/addevent (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	const datetimere = /\d{4}(-\d\d){2} \d\d(:\d\d){2}/;

	var event_owner = "PUBLIC";
	var event_detail = match[1];

	// validate event to be input
	if (match[1].split(" ").length < 3){
		
		bot.sendMessage(chatId, "Usage: /addevent [event_name] [event_time], use flag -p to make it private");
	
	} else if (!match[1].match(datetimere)) {	
		
		bot.sendMessage(chatId, `event_time format 'YYYY-MM-DD HH:MM:SS'`);

	} else {
		// check for private flag
		if (match[1].match(/-p/)) {
			event_owner = msg.from.id;
			event_detail = event_detail.replace(/-p/,"").trim()

		}
	
		// get event name and time
		var event_name = event_detail.replace(datetimere, "").trim();
		var event_time = event_detail.match(datetimere)[0];

		dbConn.query("INSERT INTO event (event_name, event_time, event_owner) VALUES (?, ?, ?)", [event_name, event_time, event_owner],
			(err, results, field) => {
				if (err) {
					console.log(err)
					bot.sendMessage(chatId, internalError);
				} else {
					bot.sendMessage(chatId, `event '${event_name}' successfully added`);
				}
			});
	}
});




bot.onText(/\/tag (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	const tag_name = match[1];

	if (tag_name) {
		dbConn.query("SELECT * FROM tags WHERE tag_name = ?", tag_name, 
			(err, results, field) => {
				if (err) {
					bot.sendMessage(chatId, internalError);
				} else if (results.length) {
					bot.sendPhoto(chatId, results[0].link);
					
				} else {
					bot.sendMessage(chatId,`tag '${tag_name}' not found :(`);
				}
		});
	} else {
		bot.sendMessage(chatId, "Usage: /tag [tag_name]");
	}


});

bot.onText(/\/tagowner (.*)/, (msg, match) => {
	const chatId = msg.chat.id;

	const tag_name = match[1];

	if(tag_name) {
		dbConn.query("SELECT * FROM tags WHERE tag_name = ?", tag_name,
			(err, results, field) => {
				if (err) {
					bot.sendMessage(chatId, internalError);
				} else if (results.length) {
					bot.sendMessage(chatId, `tag ${tag_name} was created by ${results[0].tag_owner}`);
				} else {
					bot.sendMessage(chatId, `tag ${tag_name} not found :(`);
				}
			});
	} else {
		bot.sendMessage(chatId, "Usage /tagowner [tag_name]");
	}


});


bot.onText(/\/addtag (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	const query = match[1].split(" ");
	const tag_name = query[0];
	const tag_owner = msg.from.username;
	const link = query[1];

	if (tag_name && link) {
		dbConn.query("INSERT INTO tags (tag_name, link, tag_owner) VALUES (?, ?, ?)", [tag_name, link, tag_owner],
			(err, results, field) => {
				if (err) {
					console.log(err)
					bot.sendMessage(chatId, internalError);
				} else {
					bot.sendMessage(chatId, `tag '${tag_name}' created`);
				}
			});
	} else {
		bot.sendMessage(chatId, "Usage: /addtag [tag_name] [link]");
	}


});


bot.onText(/\/deletetag (.*)/, (msg, match) => {
	const chatId = msg.chat.id;

	if (!match[1]) {
		bot.sendMessage(chatId, "Usage: /deletetag [tag_name]");
	} else {

		dbConn.query("DELETE FROM tags WHERE tag_name = ?", match[1],
			(err, results, field) => {
				if (err) {
					bot.sendMessage(chatId, internalError);
				} else {
					bot.sendMessage(chatId, `tag '${match[1]}' deleted`);
				}
			}
			);
	}

});


bot.onText(/\/taglist/, (msg, match) => {

	const chatId = msg.chat.id;
	var resp = "";

	dbConn.query("SELECT * FROM tags", (err, results, field) => {
		if (err) {
			bot.sendMessage(chatId, internalError);
		} else {

			results.forEach(r => {
				resp += `${r.tag_name},`
			})
			resp = resp.replace(/,$/, "");

			bot.sendMessage(chatId, resp);
		}
	});	


});

bot.onText(/\/random/, (msg, match) => {
	const chatId = msg.chat.id;
	// console.log("release the memes");

	var posts = [];
	snoo.getSubreddit("dankmemes")
	.getTop({time: "day", limit:100})
	.then(res => {

		res.forEach(post => {
			
			posts.push({
				text: post.title,
				link: post.url,
				is_video: post.is_video
			})
			// console.log(post.title);
			// bot.sendMessage(post.title);
		})
		// console.log(posts);
		let postIdx = Math.floor(Math.random()*100);
		bot.sendMessage(chatId, posts[postIdx].text);
		bot.sendPhoto(chatId, posts[postIdx].link);

	})
	.catch(err => {
		console.log(err);
		bot.sendMessage(chatId, internalError);
	})

});

bot.onText(/\/r (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	const userId = msg.from.id;
	var subreddit;
	var flag;
	var amount;
	// console.log(`userId : ${userId} type : ${typeof(userId)}`);
	// console.log(`BANNEDUSERID : ${BANNEDUSERID} type : ${typeof(BANNEDUSERID)}`);
	
	// special treatment for the birthday boy
	// if (userId == BANNEDUSERID) {
	// 	subreddit = 'fiftyfifty';
	// } else {
	// 	subreddit = match[1];
	// }
	var args = match[1].split(" ");
	subreddit = args[0];
	flag = args[1];
	amount = parseInt(args[2]) || 1;
	
	// console.log(subreddit);

	if (subreddit) {
		var posts = [];
		snoo.getSubreddit(subreddit)
		.getHot({limit: 100})
		.then(res => {

			res.forEach(post => {
				posts.push({
					text: post.title,
					link: post.url,
					is_video: post.is_video,
					media: post.media,
					desc: post.selftext,
					link_flair_text: post.link_flair_text,
					comments: post.comments
				})
			})
			let postIdx = Math.floor(Math.random()*100);
			bot.sendMessage(chatId, posts[postIdx].text);
			if (posts[postIdx].is_video === true) { // check if the post if a gif
				bot.sendVideo(chatId, posts[postIdx].media.reddit_video.fallback_url);
			} else {
				if (posts[postIdx].media === null) { // check if the post is a static image
					bot.sendPhoto(chatId, posts[postIdx].link);

				} else { // send a video post
					let vid_url = posts[postIdx].media.oembed.html.match(/src=".*" frame/)[0]
					.replace(`src="`, '')
					.replace(`" frame`, '')
					// bot.sendMessage(chatId, vid_url);
					bot.sendVideo(chatId, vid_url);
				}
			}

			if (flag == "-c" || flag == "--comments") {
				posts[postIdx].comments.fetchMore({
					amount: amount,
					sort: 'top'
				})
				.then(ext => {
					ext.forEach(com => {
						bot.sendMessage(chatId, com.body);
					})
				})
			} else if (flag == '-d') {
				bot.sendMessage(chatId, posts[postIdx].desc);
			} else if (flag == "-lf") {
				bot.sendMessage(chatId, posts[postIdx].link_flair_text);
			}
		})
		.catch(err => {
			console.log(err);
			bot.sendMessage(chatId, internalError);
		})
	} else {
		bot.sendMessage(chatId, "Usage /r [subreddit_name]");
	}
});

// get random question from askreddit and top comment
bot.onText(/\/ask/, (msg, match)=> {

	const chatId = msg.chat.id;
	const subreddit = "askreddit";

	var posts = [];

	snoo.getSubreddit(subreddit)
	.getHot({limit: 100})
	.then( res => {
		
		res.forEach(post => {
			
			posts.push({
				question : post.title,
				comments: post.comments
			})

		})

		let postIdx = Math.floor(Math.random()*100);
		
		bot.sendMessage(chatId, `**${posts[postIdx].question}**`, opts);
		
		posts[postIdx].comments.fetchMore({
			amount:2,
			sort: 'top'
		})
		.then(ext => {
		
			ext.forEach(com => {
				bot.sendMessage(chatId, com.body);
			})
		})
		
	})
	.catch(err => {
		console.log(err);e
		bot.sendMessage(chatId, internalError);
	})


});


bot.onText(/\/short (.*)/, (msg, match) => {
	const chatId = msg.chat.id;
	let resp = '';
	let links = match[1].split(' ');
	let body;
	const url = `http://bmusuko.ninja:3000/short/createLink`
	const config = {
		headers: {
		  'Content-Type': 'application/x-www-form-urlencoded'
		}
	  }
	if(links.length == 1 || links.length == 2){
		if(links.length == 1){
			body = {
				real_link: links[0]
			}
		} else if(links.length == 2){
			body ={
				real_link: links[0],
				desired_link: links[1]
			}
		}
		axios.post(url,qs.stringify(body),config)
		.then((response)=>{
			bot.sendMessage(chatId, response.data.data.generated_link);
		})
		.catch((err)=>{
			bot.sendMessage(chatId, internalError);
			console.log(err);
		})
	} else{
		bot.sendMessage(chatId, internalError);
		
	}
});