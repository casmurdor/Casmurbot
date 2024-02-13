/**
 * Loads environment variables from a .env file into process.env.
 */
require("dotenv").config();

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
const commands = ["start", "kick", "ban", "unban"];

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
    const botMember = await ctx.getChatMember(ctx.botInfo.id);
    return botMember.can_restrict_members;
};

/**
 * Restricts a user based on the provided action.
 * 
 * @param {Object} ctx - The context object.
 * @param {Function} action - The action to perform on the target user.
 * @returns {Promise<void>} - A promise that resolves when the user is restricted.
 */
async function restrictUser(ctx, action) {
    if (await isAdmin(ctx)) {
        if (await canRestrict(ctx) && ctx.message.reply_to_message) {
            const targetUser = ctx.message.reply_to_message.from.id;
            if (targetUser) {
                try {
                    await action(targetUser);
                } catch (error) {
                    console.error("Error:", error);
                    ctx.reply("An error occurred while trying to restrict the user");
                }
            }
        } else {
            ctx.reply("I can't restrict members");
        }
    } else {
        ctx.reply("You are not an administrator");
    }
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
bot.command("help", async (ctx) => {
    ctx.reply("Available commands:\n");
    commands.forEach((command) => {
        ctx.reply(`/${command}`);
    });
});

/**
 * Handles the "kick" command.
 * @param {Object} ctx - The context object.
 */
bot.command("kick", async (ctx) => {
    await restrictUser(ctx, async (targetUser) => {
        await ctx.banChatMember(targetUser);
        await ctx.unbanChatMember(targetUser);
    });
});

/**
 * Handles the "ban" command.
 * @param {Object} ctx - The context object.
 */
bot.command("ban", async (ctx) => {
    await restrictUser(ctx, async (targetUser) => {
        await ctx.banChatMember(targetUser);
    });
});

/**
 * Handles the "unban" command.
 * @param {Object} ctx - The context object.
 */
bot.command("unban", async (ctx) => {
    await restrictUser(ctx, async (targetUser) => {
        await ctx.unbanChatMember(targetUser);
    });
});

/**
 * Handles messages containing Twitter URLs.
 * @param {Object} ctx - The context object.
 */
bot.hears(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g, async (ctx) => {
    const tweetUser = ctx.message.text.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/\d+/)[1];
    const tweetId = ctx.message.text.match(/\/status\/(\d+)/)[1];
    const cleanedTweetUrl = `https://fxtwitter.com/${tweetUser}/status/${tweetId}`;
    ctx.reply("From @" + ctx.message.from?.username + ":\n" + cleanedTweetUrl);
});

/**
 * Handles text messages.
 * @param {Object} ctx - The context object.
 */
bot.on("message:text", (ctx) => {
    if (ctx.message.text === "Hola") {
        ctx.reply("UwU");
    }
});

/**
 * Starts the bot.
 */
bot.start();
