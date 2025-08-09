import { Markup, Scenes, session, Telegraf } from "telegraf";
import { Stage } from "telegraf/scenes";
import { Level } from "level";

const db = new Level("database", {
  keyEncoding: "json",
  valueEncoding: "json",
});

const app = new Telegraf("8377021132:AAH5of3dEo9jClCWE2YrOM0Tn6JTqg8F8Ww");

const leaveButton = Markup.inlineKeyboard([
  [Markup.button.callback("لغو", "cancel")],
]);

const userInfoWizard = new Scenes.WizardScene(
  "user_info",
  (ctx) => {
    ctx.wizard.state.user_info = {};
    ctx.reply("اسمت چیه؟", leaveButton);
    ctx.wizard.next();
  },
  (ctx) => {
    if (!ctx.message?.text) {
      return ctx.reply("لطفا یک اسم معتبر وارد کنید!");
    }
    ctx.wizard.state.user_info.name = ctx.message.text;
    ctx.reply("چند سالته؟", leaveButton);
    ctx.wizard.next();
  },
  (ctx) => {
    const age = parseInt(ctx.message.text);
    if (isNaN(age) || age < 10 || age > 100) {
      return ctx.reply("سن باید بین 10 تا 100 باشد");
    }
    ctx.wizard.state.user_info.age = age;

    ctx.reply(
      `اطلاعاتت درسته؟\n\nاسم: ${ctx.wizard.state.user_info.name}\nسن: ${
        ctx.wizard.state.user_info.age ?? age
      }`,
      Markup.inlineKeyboard([
        [Markup.button.callback("بله", "yes")],
        [Markup.button.callback("خیر", "no")],
        [Markup.button.callback("لغو", "cancel")],
      ])
    );
  }
);

userInfoWizard.action("yes", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.scene.leave();
  await db.put(
    `user_info:${ctx.from.id}`,
    JSON.stringify({ ...ctx.wizard.state.user_info })
  );
  ctx.reply("شما با موفقیت ثبت نام شدید!");
});

userInfoWizard.action("no", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.scene.leave();
});

userInfoWizard.action("cancel", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  await ctx.scene.leave();
  ctx.reply("شما فرم را لغو کردید!");
});

const stage = new Stage([userInfoWizard]);

app.use(session());
app.use(stage.middleware());

app.action("signup", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.deleteMessage();
  ctx.scene.enter("user_info");
});

app.command("start", (ctx) => ctx.scene.enter("user_info"));

app.command("info", async (ctx) => {
  const findUser = await db.get(`user_info:${ctx.from.id}`);

  if (!findUser)
    return ctx.reply(
      "اطلاعات شما پیدا نشد!",
      Markup.inlineKeyboard([[Markup.button.callback("ثبت نام", "signup")]])
    );

  const { name, age } = JSON.parse(findUser);

  return ctx.reply(`اطلاعات شما:\n\nاسم: ${name}\nسن: ${age}`);
});

app.launch(() => console.log("Bot Run"));
