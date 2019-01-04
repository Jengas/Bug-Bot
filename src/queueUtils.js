"use strict";
const config = require("../config");
const customConfig = require('../configEdit');
const utils = require("./utils");
const modUtils = require('./modUtils');
const tutils = require("./trelloUtils");

function deniedReport(bot, msg, db, key, reportInfo) {
  db.run("UPDATE reports SET reportStatus = 'closed' WHERE id = ?", [key]);
  db.all("SELECT info, userTag FROM reportQueueInfo WHERE id = ? AND stance = 'deny'", [key], function(error, DBReportInfo) {

    let DBReportInfoArray = DBReportInfo.map(function(allInfo){
      return utils.cleanUserTag(allInfo.userTag) + " | " + allInfo.info;
    });

    bot.deleteMessage(config.channels.queueChannel, reportInfo.reportMsgID).then(() => {
      bot.createMessage(config.channels.queueChannel, "**#" + key + "** | `" + reportInfo.header + "` было отказано, потому что:\n- `" + DBReportInfoArray.join("`\n- `") + "`").then(utils.delay(customConfig.minuteDelay)).then((dndRsn) => {
        bot.deleteMessage(config.channels.queueChannel, dndRsn.id).catch(() => {});
        bot.getDMChannel(reportInfo.userID).then((DMInfo) => {
          bot.createMessage(DMInfo.id, "Привет " + DMInfo.recipient.username + ", к сожалению, ошибка, о которой вы сообщали ранее: `" + reportInfo.header + "` было отказано, потому что:\n- `" + DBReportInfoArray.join('`\n- `') +
          "`\n\nВы должны попробовать добавить столько информации, сколько вы можете, когда вы публиете его. Вот несколько полезных советов:\n- Ваша ошибка происходит только на определённом аккаунте?\n- Постарайтесь быть как можно более конкретным. Такие обобщения, как \"Это глюки\", не полезны и приводят к путанице.\n- Попытайтесь сохранить каждый шаг повтора для одного действия.\n\nСпасибо за отчёт, и мы с нетерпением ждем вашего следующего! :thumbsup:\n\nНиже вы найдете свое оригинальное сообщение:\n```\n!submit " +
          reportInfo.header + " | " + reportInfo.reportString + "```").catch(() => {
            bot.createMessage(config.channels.modLogChannel, ":warning: Не могу написать в Личку **" + utils.cleanUserTag(allInfo.userTag) + "**. Репорт **#" + key + "** отказано.");
          });
            modUtils.getBug(bot, config.channels.deniedBugChannel, key, null, null, db);
        });
      }).catch((error) => {console.log("deniedReport | createMessage denied because:\n" + error)});
    }).catch(() => {});
  });
}

function queueReport (bot, userTag, userID, channelID, db, msg, reportCapLinks, queueReportString, header) {
  let reportID;
  db.serialize(function() {
    db.get("SELECT id FROM reports ORDER BY id DESC LIMIT 1", function(err, dbInfo) {
      if(!!err) {
        console.log(err);
      }
      if(!!dbInfo) {
        reportID = dbInfo.id + 1;
      } else {
        reportID = 1000;
      }

      let cardID;
      if(channelID === config.channels.iosChannel) {
        cardID = config.cards.iosCard;
      } else if(channelID === config.channels.androidChannel) {
        cardID = config.cards.androidCard;
      } else if(channelID === config.channels.canaryChannel) {
        cardID = config.cards.canaryCard;
      } else if(channelID === config.channels.linuxChannel) {
        cardID = config.cards.linuxCard;
      }

      bot.createMessage(config.channels.queueChannel, "───────────────────\n<#" + channelID + "> **" + utils.cleanUserTag(userTag) + "** Reported:\n" + queueReportString + "\n\nВышеуказанный отчет должен быть утвержден.\nID отчета: **" + reportID + "**\n").then((qMsg) => {
        let queueMsgID = qMsg.id;

        db.run("INSERT INTO reports(id, header, reportString, userID, userTag, cardID, reportStatus, canRepro, cantRepro, reportMsgID, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime())", [reportID, header, reportCapLinks, userID, userTag, cardID, 'queue', 0, 0, queueMsgID], function(err) {if(!!err){console.log(err);}}); //message ID of report in Queue, later changed to ID in main chat. And time the report was reported (for statistical purposes)
        utils.botReply(bot, userID, channelID, "ваша ошибка была добавлена в очередь на утверждение! Вы будете уведомлены, когда статус ваших обновлений отчета, просто сидеть сложа руки сейчас, пока Охотники за багами сделают свою магию!", null, msg.id, false);
        bot.createMessage(config.channels.modLogChannel, ":pencil: **" + utils.cleanUserTag(userTag) + "** отправлен `" + header + "` в <#" + channelID + ">"); //log to bot-log
      }).catch((err) => {console.log("queueUtils | createQueue Msg\n" + err);});
    });
  });
}

function addAD(bot, channelID, userTag, userID, command, msg, db, key, ADcontent, checkQueueReport, reportInfo, editMsgCont, trello) {
  switch (command.toLowerCase()) {
    case "!approve":
      if(!!checkQueueReport) { //Update reportQueueInfo (User has already given their input and wants to change it)
        let cantRepro;
        let canRepro;
        db.run("UPDATE reportQueueInfo SET info = ?, stance = 'approve' WHERE id = ? AND userID = ? AND stance != 'note'", [ADcontent, key, userID], function() {
          if(checkQueueReport.stance === "deny"){
            cantRepro = reportInfo.cantRepro - 1;
            canRepro = reportInfo.canRepro + 1;
          } else {
            cantRepro = reportInfo.cantRepro;
            canRepro = reportInfo.canRepro;
          }
          db.run("UPDATE reports SET cantRepro = ?, canRepro = ? WHERE id = ?", [cantRepro, canRepro, key], function() {
            if(canRepro >= customConfig.approveAttempts) { // approve report
              tutils.addReportTrello(bot, key, db, trello);
            } else {
              if(!!editMsgCont) {
                let splitMsg = editMsgCont.content.split("ID отчета: **" + key + "**");
                let split = splitMsg[1];

                let regex = "(\\<\\:greenTick\\:" + config.emotes.greenTick + "\\>|\\<\\:redTick\\:" + config.emotes.redTick + "\\>)\\s(\\*\\*" + utils.cleanUserTagRegex(userTag) + "\\*\\*):?\\s(.*)";
                let newRegex = new RegExp(regex, "gi");

                let newRepro = "<:greenTick:" + config.emotes.greenTick + "> **" + utils.cleanUserTag(userTag) + "**: `" + ADcontent + "`";
                let replace = split.replace(newRegex, newRepro);
                let newMsg = splitMsg[0] + "ID отчета: **" + key + "**" +  replace;
                bot.editMessage(config.channels.queueChannel, reportInfo.reportMsgID, newMsg).catch(err => {console.log("edit approve update\n" + err);}).catch((err) => {console.log("queueUtils | editApprove Msg\n" + err);});
              }
            }
            utils.botReply(bot, userID, channelID, "вы успешно изменили свою позицию в отчете **#" + key + "**", command, msg.id);
            bot.createMessage(config.channels.modLogChannel, ":thumbsup: **" + utils.cleanUserTag(userTag) + "** обновлил(а) своё утверждение: **#" + key + "** `" + reportInfo.header + "` | `" + ADcontent + "`"); //log to bot-log
          });
        });
      } else { //new reportQueueInfo entries. Add XP here
        let canRepro = reportInfo.canRepro + 1;
        db.run("INSERT INTO reportQueueInfo (id, userID, userTag, info, stance) VALUES (?, ?, ?, ?, ?)", [key, userID, userTag, ADcontent, 'approve'], function() {
          db.run("UPDATE reports SET canRepro = ? WHERE id = ?", [canRepro, key], function() {
            if(canRepro >= customConfig.approveAttempts) { // approve report
              tutils.addReportTrello(bot, key, db, trello);
            } else {
              if(!!editMsgCont) {
                let splitMsg = editMsgCont.content.split("ID отчета: **" + key + "**");
                let newMsg = splitMsg[0] + "ID отчета: **" + key + "**\n<:greenTick:" + config.emotes.greenTick + "> **" + utils.cleanUserTag(userTag) + "**: `" + ADcontent + "`" + splitMsg[1];
                bot.editMessage(config.channels.queueChannel, reportInfo.reportMsgID, newMsg).catch(err => {console.log("edit approve new\n" + err);}).catch((err) => {console.log("queueUtils | addNewApproval Msg\n" + err);});
              }
            }
            utils.botReply(bot, userID, channelID, "вы успешно подтвердили отчёт **#" + key + "**", command, msg.id);
            bot.createMessage(config.channels.modLogChannel, ":thumbsup: **" + utils.cleanUserTag(userTag) + "** подтвердил: **#" + key + "** `" + reportInfo.header + "` | `" + ADcontent + "`"); //log to bot-log
          });
        });
      }
    break;
    case "!deny":
      if(!!checkQueueReport) { //Update reportQueueInfo (User has already given their input and wants to change it)
        let cantRepro;
        let canRepro;
        db.run("UPDATE reportQueueInfo SET info = ?, stance = 'deny' WHERE id = ? AND userID = ? AND stance != 'note'", [ADcontent, key, userID], function() {
          if(checkQueueReport.stance === "approve"){
            cantRepro = reportInfo.cantRepro + 1;
            canRepro = reportInfo.canRepro - 1;
          } else {
            cantRepro = reportInfo.cantRepro;
            canRepro = reportInfo.canRepro;
          }
          db.run("UPDATE reports SET cantRepro = ?, canRepro = ? WHERE id = ?", [cantRepro, canRepro, key], function() {
            if(cantRepro >= customConfig.denyAttempts) { // deny report
              deniedReport(bot, msg, db, key, reportInfo);
            } else {
              if(!!editMsgCont) {
                let splitMsg = editMsgCont.content.split("ID отчета: **" + key + "**");
                let split = splitMsg[1];

                let regex = "(\\<\\:greenTick\\:" + config.emotes.greenTick + "\\>|\\<\\:redTick\\:" + config.emotes.redTick + "\\>)\\s(\\*\\*" + utils.cleanUserTagRegex(userTag) + "\\*\\*):?\\s(.*)";
                let newRegex = new RegExp(regex, "gi");

                let newRepro = "<:redTick:" + config.emotes.redTick + "> **" + utils.cleanUserTag(userTag) + "**: `" + ADcontent + "`";
                let replace = split.replace(newRegex, newRepro);
                let newMsg = splitMsg[0] + "ID отчета: **" + key + "**" + replace;

                bot.editMessage(config.channels.queueChannel, reportInfo.reportMsgID, newMsg).catch(err => {console.log("edit Deny update\n" + err);}).catch((err) => {console.log("queueUtils | editDenial Msg\n" + err);});
              }
            }
            utils.botReply(bot, userID, channelID, "you've successfully changed your stance on report **#" + key + "**", command, msg.id);
            bot.createMessage(config.channels.modLogChannel, ":thumbsdown: **" + utils.cleanUserTag(userTag) + "** updated their denial: **#" + key + "** `" + reportInfo.header + "` | `" + ADcontent + "`"); //log to bot-log
          });
        });
      } else { //new reportQueueInfo entries.
        let cantRepro = reportInfo.cantRepro + 1;
        db.run("INSERT INTO reportQueueInfo (id, userID, userTag, info, stance) VALUES (?, ?, ?, ?, ?)", [key, userID, userTag, ADcontent, 'deny'], function() {
          db.run("UPDATE reports SET cantRepro = ? WHERE id = ?", [cantRepro, key], function() {
            if(cantRepro >= customConfig.denyAttempts || reportInfo.userID === userID) { // deny report
              deniedReport(bot, msg, db, key, reportInfo);
            } else { //Add XP here
              if(!!editMsgCont) {
                let splitMsg = editMsgCont.content.split("ID отчета: **" + key + "**");
                let newMsg = splitMsg[0] + "ID отчета: **" + key + "**\n<:redTick:" + config.emotes.redTick + "> **" + utils.cleanUserTag(userTag) + "**: `" + ADcontent + "`" + splitMsg[1];
                bot.editMessage(config.channels.queueChannel, reportInfo.reportMsgID, newMsg).catch(err => {console.log("edit Deny new\n" + err);}).catch((err) => {console.log("queueUtils | newDenial Msg\n" + err);});
              }
            }
            utils.botReply(bot, userID, channelID, "you've successfully denied report **#" + key + "**", command, msg.id);
            bot.createMessage(config.channels.modLogChannel, ":thumbsdown: **" + utils.cleanUserTag(userTag) + "** denied: **#" + key + "** `" + reportInfo.header + "` | `" + ADcontent + "`"); //log to bot-log
          });
        });
      }
    break;
  }
}

function editDBReport(bot, trello, db, key, editSection, newContent, oldReportString) {
  if(editSection === "short description") {
    db.run("UPDATE reports SET header = ? WHERE id = ?", [newContent, key]);
  } else {
    let requiredFields = ["steps to reproduce", "expected result", "actual result", "client setting", "system setting"];
    let thisIndex = requiredFields.indexOf(editSection);
    let pattern = "(" + editSection + ")s?:\\s*(.*)(?=\\s" + requiredFields[thisIndex + 1] + ")s?";
    let newRegex = new RegExp(pattern, "i");
    let newReport = oldReportString.replace(newRegex, utils.toTitleCase(editSection) + ": " + newContent);
    db.run("UPDATE reports SET reportString = ? WHERE id = ?", [newReport, key]);
  }
}

module.exports = {
  queueReport: queueReport,
  addAD: addAD,
  editDBReport: editDBReport,
  deniedReport: deniedReport
}
