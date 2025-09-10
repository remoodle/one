https://github.com/bot-base/telegram-bot-template

I’m building an app that imports events from Moodle calendars. I want to add a reminder system where users can configure thresholds like “2d”, “6h”, “1h” before the event. Instead of storing thresholds or booleans, I think it’s cleaner to store only the absolute datetimes when the notifications should fire, and then mark them as delivered once they are sent. If the event time changes, I can always regenerate these reminders from the thresholds. So the schema would have events, a place for user-defined thresholds, and a reminders collection with absolute notifyAt times and a delivered flag.

TODO:

DB

- [ ] User settings and stuff
- [ ] Events
- [ ] Reminders

reminder mechanism

bot
