import { Telegraf } from "telegraf";
import { Level } from "level";
import axios from "axios";
import { message } from "telegraf/filters";

const db = new Level("database", {
  keyEncoding: "json",
  valueEncoding: "json",
});

const app = new Telegraf("8377021132:AAH5of3dEo9jClCWE2YrOM0Tn6JTqg8F8Ww");

const responseCity = async (city) => {
  try {
    const response = await axios.get(
      "https://geocoding-api.open-meteo.com/v1/search",
      {
        params: {
          name: city,
          count: 1,
          language: "fa",
        },
      }
    );

    const { latitude, longitude } = response.data.results[0];

    return { ok: true, message: "success", data: { latitude, longitude } };
  } catch (error) {
    console.log(error);
    return { ok: false, message: "error to get data", data: null };
  }
};

const responseCityInfo = async (city, lat, lon, ctx, edited_message_id) => {
  try {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
      },
    });

    const { timezone_abbreviation } = await response.data;
    const { time, temperature, windspeed } = await response.data
      .current_weather;

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      edited_message_id,
      undefined,
      `مشخصات آب و هوای شهر ${city}\n\nدما: ${temperature}\nسرعت باد: ${windspeed}\nتایم زون منطقه: ${timezone_abbreviation}\n\nآخرین بروزرسانی: ${time}`
    );
  } catch (error) {
    await ctx.reply(
      error.response?.data?.message ?? "مشکلی در گرفتن مشخصات شهر شما پیش آمد!"
    );
  }
};

app.on(message("text"), async (ctx, next) => {
  const message = ctx.message.text;
  const city = message.split(" ")[1];

  if (!message.includes("هواشناسی")) return next();
  if (!city) return next();

  const { message_id } = await ctx.reply("در حال گرفتن مشخصات شهر شما....");

  const resCity = await responseCity(city);

  if (!resCity.ok) {
    return ctx.telegram.editMessageText(
      ctx.chat.id,
      message_id,
      null,
      resCity.message
    );
  }

  return await responseCityInfo(
    city,
    resCity.data.latitude,
    resCity.data.longitude,
    ctx,
    message_id
  );
});

app.launch(() => {
  console.log("Bot Run");
});
