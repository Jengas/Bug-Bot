"use strict";
const config = require("../config");
const customConfig = require('../configEdit');
const utils = require("../src/utils");

let addRoles = {
  pattern: /!ios|!android|!linux/i,
  execute: function(bot, channelID, userTag, userID, command, msg) {
    let roles = msg.member.roles;
    switch (command.toLowerCase()) {
      // case "!android":
      //   var android = config.roles.androidAlphaRole;
      //   var index = roles.indexOf(android);
      //   if(index === -1){
      //     roles.push(android);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been given the role of `Android Alpha`. Use the same command again to remove this role from yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | Android addRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":robot: Gave `Android Alpha` to **" + userTag + "**");
      //     });
      //   }else{
      //     roles.splice(index, 1);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been removed from the `Android Alpha` role. Use the same command again to add this role to yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | Android removeRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":robot: Removed `Android Alpha` from **" + userTag + "**");
      //     });
      //   }
      // break;
      // case "!ios":
      //   var ios = config.roles.iosTestflightRole;
      //   var index = roles.indexOf(ios);
      //   if(index === -1){
      //     roles.push(ios);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been given the role of `iOSTestflight`. Use the same command again to remove this role from yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | iOS addRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":iphone: Gave `iOSTestflight` to **" + userTag + "**");
      //     });
      //   }else{
      //     roles.splice(index, 1);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been removed from the `iOSTestflight` role. Use the same command again to add this role to yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | iOS removeRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":iphone: Removed `iOSTestflight` from **" + userTag + "**");
      //     });
      //   }
      // break;
      // case "!linux":
      //   var linux = config.roles.linuxTesterRole;
      //   var index = roles.indexOf(linux);
      //   if(index === -1){
      //     roles.push(linux);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been given the role of `Linux Tester`. Use the same command again to remove this role from yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | Linux Tester addRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":penguin: Gave `Linux Tester` to **" + userTag + "**");
      //     });
      //   }else{
      //     roles.splice(index, 1);
      //     bot.editGuildMember(msg.channel.guild.id, userID, {
      //       roles: roles
      //     }).then(() => {
      //       bot.createMessage(channelID, "<@" + userID + ">, you have been removed from the `Linux Tester` role. Use the same command again to add this role to yourself.").then(utils.delay(customConfig.delayInS)).then((msgInfo) => {
      //         bot.deleteMessage(channelID, msgInfo.id).catch(() => {});
      //         bot.deleteMessage(channelID, msg.id).catch(() => {});
      //       }).catch((err) => {
      //         console.log("--> AddRoles | Linux Tester removeRole\n" + err);
      //       });
      //       bot.createMessage(config.channels.modLogChannel, ":penguin: Removed `Linux Tester` from **" + userTag + "**");
      //     });
      //   }
      // break;
    }
  },
  roles: [
    config.roles.everybodyRole
    ],
  channels: [
    config.channels.allChannels
  ],
  acceptFromDM: false
}
module.exports = addRoles;
