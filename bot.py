from telegram import Bot
import asyncio
import os

async def send_message():
    bot_token = os.getenv("BOT_TOKEN")
    chat_id = os.getenv("CHAT_ID")
    message = """/chat یک داستان پندآموز 500 تا 800 کلمه‌ای به زبان فارسی بنویس که شامل یک درس اخلاقی واضح (مثل اهمیت صداقت، شجاعت، مهربانی یا تلاش) باشد. داستان باید شخصیت‌های ساده و قابل‌باور، یک روایت جذاب با آغاز، میانه و پایان مشخص، و لحن الهام‌بخش مناسب برای مخاطبان عام داشته باشد. داستان باید برای تبدیل به ویدیوی 4 تا 9 دقیقه‌ای مناسب باشد، با صحنه‌های قابل‌تصور و دیالوگ‌های طبیعی. هر چیز اضافه ای رو حذف کن و فقط داستانو بگو و انتهای داستان اضافه کن برای داستان های بیشتر لایک و سابسکرایب فراموش نشه"""

    bot = Bot(token=bot_token)
    try:
        await bot.send_message(chat_id=chat_id, text=message)
        print("پیام با موفقیت ارسال شد!")
    except Exception as e:
        print(f"خطا در ارسال پیام: {e}")

if __name__ == "__main__":
    asyncio.run(send_message())
