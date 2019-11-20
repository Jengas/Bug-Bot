"use strict";
const config = require("../config");
const utils = require("./utils");
const sections = require('./getSections');
const reproUtils = require('./reproUtils');
const attachUtils = require('./attachUtils');
const dateFormat = require('dateformat');

function addReportTrello(bot, key, db, trello) { // add report to trello
  
  db.serialize(function(){
    db.get('SELECT header, reportString, userID, userTag, cardID, reportMsgID FROM reports WHERE id = ?', [key], function(error, report) {

      let allSections = sections(report.reportString);

      let stepsToRepro = allSections["steps to reproduce"];
      stepsToRepro = stepsToRepro.replace(/(-)\s/gi, '\n$&');
      let expectedResult = allSections["expected result"];
      let actualResult = allSections["actual result"];

      const reportString = '\n\n####Шаги для повторения:' + stepsToRepro + '\n\n####Ожидаемый результат:\n' + expectedResult + '\n####Реальный результат:\n' + actualResult;
      const reportChatString = "\n**Короткое описание:** " + report.header + "\n**Шаги для повторения:** " + stepsToRepro + "\n**Ожидаемый релузьтат:** " + expectedResult + "\n**Реальный результат:** " + actualResult;

      let success = function(successError, data) {
        
        bot.deleteMessage(config.channels.queueChannel, report.reportMsgID).catch(() => {});
        let postChannelID;
        switch (report.cardID) {
          case config.cards.iosCard:
            postChannelID = config.channels.iosChannel;
            break;
          case config.cards.androidCard:
            postChannelID = config.channels.androidChannel;
            break;
          case config.cards.canaryCard:
            postChannelID = config.channels.canaryChannel;
            break;
          case config.cards.linuxCard:
            postChannelID = config.channels.linuxChannel;
            break;
        }
        bot.createMessage(postChannelID, "───────────────────────\nРепорт от **" + utils.cleanUserTag(report.userTag) + "**" + reportChatString + "\n<" + data.shortUrl + "> - **#" + key + "**\n\n**Reproducibility:**\n").then((msgInfo) => {
          // change reportStatus, trelloURL & queueMsgID
          // attach all attachments to the trello post
          let trelloURL = data.shortUrl.match(/(?:(?:<)?(?:https?:\/\/)?(?:www\.)?trello.com\/c\/)?([^\/|\s|\>]+)(?:\/|\>)?(?:[\w-\d]*)?(?:\/|\>|\/>)?/i);
          let trelloUrlSuffix = trelloURL[1];
          db.run("UPDATE reports SET reportStatus = 'trello', trelloURL = ?, reportMsgID = ? WHERE id = ?", [trelloUrlSuffix, msgInfo.id, key]);
          bot.createMessage(config.channels.modLogChannel, ":incoming_envelope: <#" + postChannelID + "> **" + utils.cleanUserTag(report.userTag) + "** - `" + report.header + "` <" + data.shortUrl + ">\n" + key); //log to bot-log

          setTimeout(function() {
            db.each('SELECT userID, userTag, attachment FROM reportAttachments WHERE id = ?', [key], function(error, attachmentData) {
              if(!!attachmentData && attachmentData.length !== 0){
                attachUtils(bot, null, attachmentData.userTag, attachmentData.userID, "!attach", null, trello, trelloURL[1], attachmentData.attachment, false, report.header);
              }
            });
            getUserInfo(report.userID, report.userTag, postChannelID, data.shortUrl, key, bot);
            db.get("SELECT cantRepro, canRepro, id, reportMsgID, trelloURL FROM reports WHERE id = ?", [key], function(err, newReport) {
              if(!!err) {
                console.log(err);
              }
              reproUtils.queueRepro(bot, trello, db, postChannelID, trelloURL[1], key, newReport);
            });
          }, 2000);
        }).catch(err => {console.log(err);});
      }

      let newReport = {
        name: report.header,
        desc: "Отчёт от " + report.userTag + reportString + "\n\n" + key,
        idList: report.cardID,
        pos: 'top'
      }
      trello.post('/1/cards/', newReport, success);
    });
  });
}

let loopGetUserInfo = 0;
function getUserInfo(userID, userTag, postChannelID, shortUrl, key, bot) {
  let guild = bot.guilds.get(config.DTserverID);
  let userInfo = guild.members.get(userID);
  if(!!guild) {
    if(!userInfo) {
      return;
    }
    if(userInfo.roles.indexOf(config.roles.initiateRole) === -1 && userInfo.roles.indexOf(config.roles.hunterRole) === -1){

      let allRoles = userInfo.roles;
      allRoles.push(config.roles.initiateRole);
      bot.editGuildMember(config.DTserverID, userID, {
        roles: allRoles
      }).then(() => {
        utils.botReply(bot, userID, config.channels.charterChannel, ", поздравляем с получением одобрения вашей ошибки! Ты практически полноценный Охотник за багами!  Последний шаг - вам нужно прочитать и согласиться с правилами этого устава, передав мне секретную фразу.  Секретную фразу можно найти только прочитав Устав!", null, null, false, true);
        bot.createMessage(config.channels.modLogChannel, `**${userTag}** была дана роль Инициата из-за ${shortUrl}`);
      });

    }
    bot.getDMChannel(userID).then((DMInfo) => {
      bot.createMessage(DMInfo.id, "Ошибка, о которой вы сообщили, была одобрена! Спасибо за ваш отчет! Вы можете найти свою ошибку в <#" + postChannelID + "> <" + shortUrl + ">").catch(() => {
        bot.createMessage(config.channels.modLogChannel, ":warning: Не могу написать в Личку **" + utils.cleanUserTag(userTag) + "**. Доклад **#" + key + "** одобрен. <" + shortUrl + ">");
      });
    }).catch((err) => {
      console.log("trelloUtils getUserInfo DM\n" + err);
    });
    loopGetUserInfo = 0;
  } else if(loopGetUserInfo >= 5) {
    setTimeout(function() {
      loopGetUserInfo++;
      getUserInfo(userID, userTag, postChannelID, shortUrl, key);
    }, 2000);
  } else {
    bot.createMessage(config.channels.modLogChannel, ":warning: Не удалось получить сведения о пользователе " + utils.cleanUserTag(userTag) + ", пользователю может потребоваться новая роль!");
    loopGetUserInfo = 0;
  }
}

function editTrelloReport(bot, trello, userTag, userID, key, editSection, newContent, msg, channelID, urlData, msgID, command) {
  if(editSection === 'short description') {
    //edit card title (name)

    var cardUpdated = function(error, data){
      utils.botReply(bot, userID, channelID, ", `" + utils.toTitleCase(editSection) + "` был обновлен до `" + newContent + "`", command, msgID, false);
      bot.createMessage(config.channels.modLogChannel, ":pencil2: **" + utils.cleanUserTag(userTag) + "** отредактировал `" + utils.toTitleCase(editSection) + "` to `" + newContent + "` <" + data.shortUrl + ">");
    }
    var updateCard = {
      value: newContent
    };
    trello.put('/1/cards/' + key + '/name', updateCard, cardUpdated);

  } else {
    //edit desc
    let pattern;

    if(editSection === "system setting") {
      pattern = editSection + "system settings?:\\n*\\s*([\\s\\S]*?)(?=(?:\\\n\\\n\\d))";
    } else {
      pattern = editSection + "s?:\\s*\\n*\\s*([\\s\\S]*?)(?=(?:\\s*\\n)?#)";
    }

    let newRegex = new RegExp(pattern, "ig");

    let trelloDesc = urlData.desc;

    if(!trelloDesc) {
      let time = new Date();
      let ptime= dateFormat(time, "GMT:mm-dd-yyyy-HH-MM");
      console.log(`${ptime} trello Desc\n${userTag} ${trelloDesc}`);
      return utils.botReply(bot, userID, channelID, "Что-то пошло не так, пожалуйста, попробуйте еще раз! Также позовите Jengas", command, msgID, false);
    }

    let editTrelloString = trelloDesc.replace(newRegex, utils.toTitleCase(editSection) + ":\n" + newContent);

    var cardUpdated = function(error, data){
      utils.botReply(bot, userID, channelID, " `" + utils.toTitleCase(editSection) + "` была обновлена", command, msgID, false);
      bot.createMessage(config.channels.modLogChannel, ":pencil2: **" + utils.cleanUserTag(userTag) + "** отредактировал `" + utils.toTitleCase(editSection) + "`до `" + newContent + "` <" + data.shortUrl + ">");
    }

    var updateCard = {
      value: editTrelloString
    };

    trello.put('/1/cards/' + key + '/desc', updateCard, cardUpdated);
  }
}

module.exports = {
  addReportTrello: addReportTrello,
  editTrelloReport: editTrelloReport
};
