import API from "./api";
import { slugify } from 'transliteration';

var Analyzes = {
	dialog: function (peerId, callback, statusFunction, peerName='') {
		var isStoppedByUser = false,

			setStatus = statusFunction,

			init = function () {
				setStatus("Инициализация", 0, 1);
				API.loadVK("execute",
					{
						code: (
							"var o=%o;return{u:API.users.get({user_ids:o,fields:\"photo_100,online,first_name_ins,last_name_ins\",v:5.2})[0],m:API.messages.getHistory({user_id:o,v:5.2}).count};"
						).replace(/%o/i, Math.abs(peerId))
					},
					function (result) {
						saveInfo(result);
					});
			},

			dialogInfo,

			saveInfo = function (result) {
				dialogInfo = {
					user: result.u,
					chat: result.c,
					count: result.m,
					isChat: !!result.c
				};
				start(0);
			},
			start = function (offset) {
				if (offset === false || isStoppedByUser) return;
				var str = [], t = (peerId > 0 ? "user" : "chat");
				for (var i = 0, l = 25; i < l; ++i) {
					str.push("API.messages.getHistory({" + t + "_id:" + Math.abs(peerId) + ",v:5.2,offset:" + (offset + (i * 200)) + ",count:200}).items");
				}
				
				API.loadVK("execute",
					{
						code: "return[" + str.join(",") + "];"
					},
					function (data) {
						if ((data = saveMessages(data)).isFull) {
							setTimeout(function () {
								start(offset + (25 * 200))
							}, 300);
						}
						else {
							showStat();
						}
						
					});
			},

			db = [],
			saveMessages = function (data) {
				var messages = [], isFull = true;
				data.forEach(function (item) {
					if (Array.isArray(item))
						messages = messages.concat(item);
				});
				isFull = data[data.length - 1] && data[data.length - 1].length == 200;
				data = null;
				db = db.concat(messages);

				return {messages: messages, isFull: isFull};
			},
			showStat = function () {
                var json = [];
                db.forEach(function (item) {
                    json.push(saver.minifyMessage(item));
                });
                var jsonString = JSON.stringify({
                    meta: {
                        v: "1.2",
                        p: peerId,
                        a: API.uid,
                        t: dialogInfo.isChat
                            ? dialogInfo.chat.title
                            : dialogInfo.user.first_name + " " + dialogInfo.user.last_name,
                        d: parseInt(new Date() / 1000),
                    },
                    data: json
                })

                // saveAs(blob, "dialog" + peerId + ".json");
                callback({'filename': "dialog" + peerId + "_" + slugify(peerName).replace(/-/g, "_") + ".json", data: jsonString});
			},
			d2006 = 1138741200,
			saver = {
				minifyMessage: function (m) {
					var o = {
						i: m.id,
						f: m.from_id,
						t: m.body,
						d: m.date - d2006
					};
					if (m.attachments)
						o.a = saver.minifyAttachments(m.attachments);
					if (m.fwd_messages)
						o.m = saver.minifyForwardedMessages(m.fwd_messages);
					return o;
				},
				minifyAttachments: function (a) {
					var o;
					return a.map(function (i) {
						o = i[i.type];
						switch (i.type) {
							case "photo":
								return {
									t: 0,
									s: {
										m: o.photo_2560,
										s: o.photo_1280,
										n: o.photo_807,
										o: o.photo_604,
										t: o.photo_130
									},
									z: o.description || "",
									q: o.lat || 0,
									w: o.long || 0,
									o: o.user_id || o.owner_id,
									i: o.id,
									d: o.date - d2006
								};
							case "video":
								return {
									t: 1,
									o: o.owner_id,
									i: o.id,
									n: o.title,
									z: o.description,
									d: o.date - d2006,
									s: o.duration
								};
							case "audio":
								return {
									t: 2,
									o: o.owner_id,
									i: o.id,
									a: o.artist,
									n: o.title,
									d: o.duration,
									l: o.lyrics_id,
									g: o.genre_id
								};
							case "doc":
								return {
									t: 3,
									o: o.owner_id,
									i: o.id,
									n: o.title,
									e: o.ext,
									s: o.size
								};
							case "sticker":
								return {
									t: 4,
									i: o.id
								};
							default:
								return {
									t: -1,
									s: i.type
								};
						}
					});
				},
				minifyForwardedMessages: function (a) {
					return a.map(function (i) {
						var o = {
							f: i.user_id,
							t: i.body,
							d: i.date - d2006
						};
						if (i.attachments)
							o.a = saver.minifyAttachments(i.attachments);
						if (i.fwd_messages)
							o.m = saver.minifyForwardedMessages(i.fwd_messages);
						return o;
					});
				}
			}
		init();
	},
	statDialogChate: null,
	
};
export default Analyzes;