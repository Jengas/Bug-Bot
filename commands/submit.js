"use strict";
const config = require("../config");
const queueUtils = require("../src/queueUtils");
const sections = require("../src/getSections");
const utils = require("../src/utils");

function checkSectionsExist(userID, report, channelID, sectionNames, db) {
  let promise = new Promise((resolve, reject) => {

    console.log(resolve);
    console.log(reject);
    

    if (!sectionNames.has('steps to reproduce')) {
      reject("необходимо включить `Steps to Reproduce: - шаг один - шаг два - шаг три (и т. д.)`");
    }

    if (!sectionNames.has('expected result')) {
      reject("необходимо включить `Expected Result:`");
    }

    if (!sectionNames.has('actual result')) {
      reject("необходимо включить `Actual Result:`");
    } else {
      resolve('')
    }
    console.log('a');
    

  });
  console.log(promise);
  
  return promise;
}

let map = new Map();
let submitCommand = {
  pattern: /!submit|!sumbit/i,
  execute: function (bot, channelID, userTag, userID, command, msg, trello, db) {
    if (map.has(userID)) {
      return;
    }

    let msgID = msg.id;
    var messageSplit = msg.content.split(' ');
    messageSplit.shift();
    let joinedMessage = messageSplit.join(' ');

    switch (command.toLowerCase()) {
      case "!submit":

        console.log('ok1');
      

        let splitter = msg.content.match(/\|/g);

        const pipe = joinedMessage.indexOf("|");
        const header = joinedMessage.substr(0, pipe).trim();
        let report = joinedMessage.substr(pipe + 1).trim();

        if (!splitter || splitter.length > 1) {
          utils.botReply(bot, userID, channelID, "ваш синтаксис, кажется немного не такой. Пожалуйста, прочитайте <#530705878844833796> для полного объяснения моего использования.", command, msg.id, true);
          return;
        }

        if (!header) {
          utils.botReply(bot, userID, channelID, "пожалуйста, включите краткое описание вашей проблемы для использования в качестве заголовка! `<краткое описание проблемы>` затем используя `|`!", command, msg.id, true);
          return;
        }

        console.log('ok2');

        let reportCapLinks = report.replace(/([(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*))/gi, "<$1>");

        const regPattern = /\b(steps to reproduce|expected result|actual result)s?:?/gi;
        let matches;
        let sectionNames = new Set();

        while (matches = regPattern.exec(reportCapLinks)) {
          sectionNames.add(matches[1].toLowerCase());
        }

        reportCapLinks = utils.cleanText(reportCapLinks, false);

        console.log('ok3');


        checkSectionsExist(userID, reportCapLinks, channelID, sectionNames, db).then(() => {
          console.log(1);
          
          let newReportString = reportCapLinks;
          let allSections = sections(newReportString, msg, bot);

          let stepsToRepro = allSections["steps to reproduce"];
          stepsToRepro = stepsToRepro.replace(/(-)\s/gi, '\n$&');
          let expectedResult = allSections["expected result"];
          let actualResult = allSections["actual result"];
          console.log('1a'+stepsToRepro);
          console.log("2b"+expectedResult);
          console.log("3c"+actualResult);
          

          let checkMissing = !stepsToRepro || !expectedResult || !actualResult;
          console.log("4d"+checkMissing);
          
          if (checkMissing) {
            utils.botReply(bot, userID, channelID, "не забудьте заполнить все необходимые поля! Если вы боретесь с синтаксисом, возможно, попробуйте этот инструмент: <https://dabbit.typeform.com/to/mnlaDU>", command, msgID, true);
            return;
          }

          let queueReportString = "\n**Короткое описание:** " + header + "\n**Шаги для повторения:** " + stepsToRepro + "\n**Ожидаемый результат:** " + expectedResult + "\n**Реальный результат:** " + actualResult;

          queueUtils.queueReport(bot, userTag, userID, channelID, db, msg, newReportString, queueReportString, header);

        }).catch((errorMessage) => {
          console.log(errorMessage);
          
          utils.botReply(bot, userID, channelID, errorMessage, command, msgID, true);
        });

        map.set(userID);
        setTimeout(function () {
          map.delete(userID);
        }, 30000);

        break;
      case "!sumbit":
        utils.botReply(bot, userID, channelID, "ты хотел сказать !submit? Если это так, то я взял на себя смелость исправить вашу команду для вас! Просто скопируйте и вставьте это:'!submit " + joinedMessage + "`", command, msg.id, true);
        break;
    }
  },
  roles: [
    config.roles.everybodyRole
  ],
  channels: [
    config.channels.iosChannel,
    config.channels.canaryChannel,
    config.channels.androidChannel,
    config.channels.linuxChannel
  ],
  acceptFromDM: false
}
module.exports = submitCommand;