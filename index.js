import { Telegraf } from "telegraf";
import { Level } from "level";
import nodeCron from "node-cron";

const db = new Level("database", {
  keyEncoding: "json",
  valueEncoding: "json",
});

const app = new Telegraf("8377021132:AAH5of3dEo9jClCWE2YrOM0Tn6JTqg8F8Ww");

const loadReminders = async () => {
  for await (const key of db.keys()) {
    const description = await db.get(key);
    const userId = key.split("-")[0];
    const [h, m] = key.split("-").slice(1).join("").split(":");

    nodeCron.schedule(`${m} ${h} * * *`, async () => {
      await db.del(key);
      await app.telegram.sendMessage(userId, description);
    });
  }

  console.log("Load all reminder");
};

app.command("reminder", async (ctx) => {
  const parts = ctx.message.text.split(" ");

  const time = parts[1];
  const message = parts.slice(2).join(" ");

  const key = `${ctx.from.id}-${time}`;

  const findTime = await db.get(key);

  if (findTime) {
    return ctx.reply("این تایم از قبل رزرو شده است!");
  }

  await db.put(key, message);
  ctx.reply("این زمان با موفقیت رزرو شد!");

  const [h, m] = time.split(":");

  nodeCron.schedule(`${m} ${h} * * *`, async () => {
    await app.telegram.sendMessage(ctx.chat.id, message);
    await db.del(key);
  });
});

app.launch(() => {
  console.log("Bot Run");
  loadReminders();
});
