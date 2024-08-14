/**
 * Loads environment variables from a .env file into process.env.
 */
require("dotenv").config();

const express = require("express");

/**
 * Represents a Telegram bot.
 * @class
 */
const { Bot } = require("grammy");

/**
 * Creates a new instance of the Bot class.
 * @param {string} token - The bot token.
 */
const bot = new Bot(process.env.BOT_TOKEN);

/**
 * An array of available commands.
 * @type {string[]}
 */
const commands = ["start", "kick", "ban", "unban", "spark"];

/**
 * Regular expression for matching Twitter and Reddit URLs.
 * @type {RegExp}
 */
const regexTwitter = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
const regexReddit = /https?:\/\/(?:www\.)?reddit\.com\/r\/\w+\/(?:comments|s)\/(\w+)(?:\/\w+)?\/?/;

/**
 * Checks if the message is a reply to the bot itself.
 * @param {Object} ctx - The context object containing the message information.
 * @returns {boolean} - Returns true if the message is a reply to the bot, otherwise false.
 */
const isMe = (ctx) => {
    return ctx.message.reply_to_message && ctx.message.reply_to_message.from.id === ctx.me.id;
};

/**
 * Checks if the user is an administrator or creator.
 * @param {Object} ctx - The context object.
 * @returns {Promise<boolean>} - A promise that resolves to true if the user is an administrator or creator, otherwise false.
 */
const isAdmin = async (ctx) => {
    const user = await ctx.getChatMember(ctx.from.id);
    return user.status === "administrator" || user.status === "creator";
};

/**
 * Checks if the bot has the ability to restrict members in a chat.
 * @param {Object} ctx - The context object.
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating whether the bot can restrict members.
 */
const canRestrict = async (ctx) => {
    const botMember = await ctx.getChatMember(ctx.me.id);
    return botMember.can_restrict_members;
};

/**
 * Restricts a user in the chat based on the provided action and context.
 * @param {*} ctx context object
 * @param {*} action action to be applied
 * @returns {Promise<void>} - A promise that resolves when the user is restricted.
 */
const restrictUser = async (ctx, action) => {
    if (isMe(ctx)) return ctx.reply("I can't restrict myself");

    if (!await isAdmin(ctx)) return ctx.reply("You are not an administrator");

    if (!await canRestrict(ctx)) return ctx.reply("I can't restrict members");

    const targetUser = ctx.message.reply_to_message?.from?.id;
    if (!targetUser) return;

    try {
        await action(targetUser);
    } catch (error) {
        console.error("Error:", error);
        ctx.reply("An error occurred while trying to restrict the user");
    };
};

/**
 * Applies an action to a target user in the chat.
 * If the user is kicked, they will be banned first and then unbanned.
 * @param {Object} ctx - The context object.
 * @param {string} action - The action to be applied (kick, ban, unban).
 * @param {number} targetUser - The ID of the target user.
 * @returns {Promise<void>} - A promise that resolves when the action is applied.
 */
const applyAction = async (ctx, action, targetUser) => {
    if (action === "kick" || action === "ban")
        await ctx.banChatMember(targetUser);

    if (action === "kick" || action === "unban")
        await ctx.unbanChatMember(targetUser);
};

/**
 * Handles the kick, ban, or unban action based on the provided context and action.
 * @param {Object} ctx - The context object containing information about the message.
 * @param {string} action - The action to be performed (kick, ban, or unban).
 * @returns {Promise<void>} - A promise that resolves when the action is completed.
 */
const handleKickBanUnban = async (ctx, action) => {
    if (ctx.message.reply_to_message) {
        const repliedUser = ctx.message.reply_to_message.from.id;
        await restrictUser(ctx, async () => {
            await applyAction(ctx, action, repliedUser);
        });
    } else {
        ctx.reply(`You need to reply to a message to ${action} a user`);
    }
};

const saveSparks = async (ctx, sparks) => {
    // TODO: Implement a way to save the sparks to a database
};

/**
 * Handles the "start" command.
 * @param {Object} ctx - The context object.
 */
bot.command("start", async (ctx) => {
    ctx.reply("Hola, soy un bot de telegram");
});

/**
 * Handles the "help" command.
 * @param {Object} ctx - The context object.
 */
bot.command("help", (ctx) => {
    ctx.reply("Available commands: " + commands.join(", "));
});

/**
 * Handles the "kick" command.
 * @param {Object} ctx - The context object.
 */
bot.command("kick", async (ctx) => {
    await handleKickBanUnban(ctx, "kick");
});

/**
 * Handles the "ban" command.
 * @param {Object} ctx - The context object.
 */
bot.command("ban", async (ctx) => {
    await handleKickBanUnban(ctx, "ban");
});

/**
 * Handles the "unban" command.
 * @param {Object} ctx - The context object.
 */
bot.command("unban", async (ctx) => {
    await handleKickBanUnban(ctx, "unban");
});

/**
 * Handles the "spark" command.
 * @param {Object} ctx - The context object.
 * @param {string[]} args - The arguments provided with the command.
 * @returns {Promise<void>} - A promise that resolves when the command is handled.
 */
bot.command("spark", async (ctx) => {
    const args = ctx.message.text.split(" ").slice(1);

    let crystals = 0;
    let tickets = 0;
    let tens = 0;
    let total = 0;
    let draws = 0;

    if (args.length === 1) {
        crystals = parseInt(args[0]);
    } else if (args.length === 2) {
        [crystals, tickets] = args.map(arg => parseInt(arg));
    } else if (args.length === 3) {
        [crystals, tickets, tens] = args.map(arg => parseInt(arg));
    } else {
        return ctx.reply("Invalid number of arguments. Usage: /spark <crystals> [<tickets>] [<10 draws tickets>]");
    }

    total = crystals + tickets * 300 + tens * 3000;
    draws = total / 300;
    saveSparks(ctx, draws);

    ctx.reply(`You have ${draws.toFixed(1)} draws.\nYou are at ${(draws / 3000 * 1000).toFixed(2)}% of the spark`);
});

/**
 * Handles messages containing Twitter URLs.
 * @param {Object} ctx - The context object.
 */
bot.hears(regexTwitter, (ctx) => {
    const tweetMatch = regexTwitter.exec(ctx.message.text);
    if (tweetMatch) {
        const tweetUser = ctx.message.text.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/\d+/)[1];
        const tweetId = ctx.message.text.match(/\/status\/(\d+)/)[1];
        const cleanedTweetUrl = `https://fxtwitter.com/${tweetUser}/status/${tweetId}`;
        ctx.reply("From @" + ctx.message.from?.username + ":\n" + cleanedTweetUrl);
    }
});

/**
 * Handles messages containing Reddit URLs.
 * @param {Object} ctx - The context object.
 */
bot.hears(regexReddit, async (ctx) => {
    const url = ctx.message.text;
    const parts = url.split("?");
    const cleanedRedditUrl = parts[0].replace("reddit.com", "rxddit.com");
    ctx.reply("From @" + ctx.message.from?.username + ":\n" + cleanedRedditUrl);
});

/**
 * Handles text messages.
 * @param {Object} ctx - The context object.
 */
bot.on("message:text", (ctx) => {
    if (ctx.message.text === "Hola" && ctx.message.chat.type === "private")
        ctx.reply("UwU");
});

/**
 * Starts the bot.
 */
bot.start();

/**
 * Starts the express server.
 */

const PORT = process.env.PORT;
const app = express();

app.get("/", (req, res) => {
    res.send("<h1 style='color:green; text-align: center;'>Bot is running</h1>");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
