'use strict';

var conf = require('confucious');
var enableMailer = conf.get('mail:enabled') || conf.get('production');

if (enableMailer) {
	console.log('Emailing enabled.');

	var nodemailer = require("nodemailer");

	var transport = nodemailer.createTransport({
		service: "Gmail",
		auth: {
			user: conf.get('mail:username'),
			pass: conf.get('mail:password'),
		},
	});

	module.exports = {
		send: function (msg) {
			return new Promise(function (resolve, reject) {
				transport.sendMail(
					{
						to: conf.get('mail:to'),
						from: conf.get('mail:from'),
						replyTo: conf.get('mail:replyTo'),
						subject: conf.get('mail:subjectPrefix') + msg.subject,
						text: msg.text,
						attachments: msg.attachments || [],
					}, 
					function (err, response) {

						if (err) {
							console.error('Error occured sending email', err);

							reject(err);
						}
						else {
							console.log("Message sent: ");
							console.log(response);

							resolve(response);
						}
					}
				);				
			})
		},
	}
}
else {
	console.log('Emailing disabled.');

	module.exports = {
		send: function (msg) {
			console.log('Email: ' + msg.subject + '\n' + msg.text);

			return Promise.resolve();
		},
	}
}