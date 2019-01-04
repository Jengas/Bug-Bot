"use strict";
const config = require("../config");
const utils = require('../src/utils');

let revoke = {
  pattern: /!revoke/i,
  execute: function(bot, channelID, userTag, userID, command, msg, trello, db) {
    let splitMsg = msg.content.split(' ');
        splitMsg.shift();

    if(!splitMsg || !splitMsg[0]) {
      utils.botReply(bot, userID, channelID, "вы, кажется, уронили свой ключ, не забудьте забрать его и дать мне?", command, msg.id);
      return;
    }
    let key = splitMsg[0];

    db.get("SELECT reportString, canRepro, cantRepro, reportMsgID, reportStatus FROM reports WHERE id = ?", [key], function(err, reportInfo) {
      if(!reportInfo) {
        //can't find report
        //reply
        utils.botReply(bot, userID, channelID, "Я не могу найти отчет, вы использовали правильный ключ?", command, msg.id);
        return;
      } else if(!!reportInfo && reportInfo.reportStatus !== "queue") {
        //report has been moved or closed
        //reply
        utils.botReply(bot, userID, channelID, "отчет уже перемещен или закрыт.", command, msg.id);
        return;
      }

      bot.getMessage(config.channels.queueChannel, reportInfo.reportMsgID).then((reportMsg) => {
        let oldReport = reportMsg.content.split("ID отчета: **" + key + "**");
        let split = oldReport[1];
        let pattern = "\\\n(\\<\\:greenTick\\:" + config.emotes.greenTick + "\\>|\\<\\:redTick\\:" + config.emotes.redTick + "\\>)\\s(\\*\\*" + utils.cleanUserTagRegex(userTag) + "\\*\\*):?\\s(.*)";
        let newRegex = new RegExp(pattern, "i");

        let matchTick = split.match(newRegex);
        if(!matchTick) {
          //reply user has not approved or denied this report
          utils.botReply(bot, userID, channelID, "you haven't given your input on this report yet.", command, msg.id);
          return;
        }

        if(matchTick[1] === '<:redTick:' + config.emotes.redTick + '>') {
          let cantRepro = reportInfo.cantRepro - 1;
          db.run("UPDATE reports SET cantRepro = ? WHERE id = ?", [cantRepro, key]);
        } else if(matchTick[1] === '<:greenTick:' + config.emotes.greenTick + '>') {
          let canRepro = reportInfo.canRepro -1;
          db.run("UPDATE reports SET canRepro = ? WHERE id = ?", [canRepro, key]);
        }

        //remove from reportQueueInfo and chat message
        //update reports with new can/trepro
        let replace = split.replace(newRegex, "");
        let newMsg = oldReport[0] + "ID отчета: **" + key + "**" + replace;
        db.run("DELETE FROM reportQueueInfo WHERE userID = ? AND id = ?", [userID, key], function(err, reply) {
          if(!!err) {
            console.log(err);
          }
          bot.editMessage(config.channels.queueChannel, reportInfo.reportMsgID, newMsg).then(() => {
            utils.botReply(bot, userID, channelID, "вы успешно удалили свой вклад в **#" + key + "**.", command, msg.id);
            bot.createMessage(config.channels.modLogChannel, ":wastebasket: **" + utils.cleanUserTag(userTag) + "** удален их ввод на **#" + key + "**");
          }).catch(err => {console.log("edit out - revoke\n" + err);});
        });

      }).catch((err) => {console.log("Revoke getMsg\n" + err);});
    });


  },
  roles: [
    config.roles.adminRole,
    config.roles.trelloModRole,
    config.roles.devRole,
    config.roles.hunterRole
    ],
  channels: [
    config.channels.queueChannel
  ],
  acceptFromDM: false
}
module.exports = revoke;
