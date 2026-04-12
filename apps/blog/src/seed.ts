import {
  initBlogSchema,
  listAllPosts,
  createBlogPost,
} from "./db";

await initBlogSchema();

const posts = await listAllPosts();
if (posts.length > 0) {
  console.log("Posts already exist, skipping seed.");
  process.exit(0);
}

await createBlogPost({
  slug: "invest-one-day",
  title: "Invest one day a month. Ignore the other thirty.",
  excerpt:
    "A letter from the person building One Day Investor — why we believe in monthly check-ins over daily anxiety.",
  tags: ["philosophy", "investing"],
  publish_date: "2026-04-01",
  content: [
    {
      type: "hero",
      label: "Philosophy",
      title:
        'Invest one day a month.<br/><span style="background: linear-gradient(to right, #ecfdf5, #a7f3d0, #6ee7b7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Ignore the other thirty.</span>',
      subtitle: "A letter from the person building One Day Investor.",
    },
    {
      type: "prose",
      label: "The ritual",
      heading: "Why a month, not a day.",
      paragraphs: [
        "I don't want to check the markets every day. I don't think you should either.",
        'Most financial apps are built on an assumption I don\'t share: that more frequent data is more useful data. So they give you notifications, intraday charts, red and green arrows, a little dopamine hit every time your portfolio moves. The implicit message is: <em class="text-emerald-50 not-italic">pay attention, you might miss something.</em>',
        "One Day Investor is built on the opposite assumption. You almost certainly won't miss anything. The things that actually matter to your long-term wealth — jobs, savings rate, whether you kept investing through the scary months — move at the speed of months and years, not minutes.",
        'So the ritual is this: <strong class="font-semibold text-emerald-50">one day a month, you open the app and write down where your money is.</strong> That\'s it. The other thirty days, you live your life.',
      ],
    },
    {
      type: "pull-quote",
      text: "The market is fast. Wealth is slow. Don't confuse them.",
    },
    {
      type: "comparison",
      label: "Positioning",
      heading: "Two gaps no bank can fill.",
      intro: "Your bank is better than One Day Investor at almost everything. It knows your exact balance to the kopeck, it processes your transactions, it sends you statements. I'm not trying to replace any of that. There are two specific things, though, that no bank can do for you.",
      left: {
        label: "What a bank shows you",
        items: [
          "One account, or at best one family of accounts.",
          "One currency.",
          "History that resets when you switch banks.",
          "Nothing about the apartment, the car, the cash under the mattress.",
        ],
      },
      right: {
        label: "What One Day Investor shows you",
        items: [
          "Every pocket you own, in one place.",
          "One net worth number, in your chosen currency.",
          "A line that outlives any bank you ever use.",
          "Everything that has a price — including the things banks can't see.",
        ],
      },
      outro:
        "The banks will keep being banks. I just want to give you the two things they can't.",
    },
    {
      type: "prose",
      label: "Organization",
      heading: "Pockets, the way you already think.",
      paragraphs: [
        'When I ask someone where their money is, they don\'t say "40% equities, 30% fixed income, 20% cash, 10% alternatives." They say: <em class="text-emerald-50 not-italic">"Some at Tinkoff, some at Interactive Brokers, the apartment, a bit of crypto, and whatever\'s in my wallet."</em>',
        "That's how pockets work in One Day Investor. A pocket is wherever you mentally keep a chunk of your net worth. One per account, or one per thing, or one per category — whatever matches the map that already lives in your head.",
      ],
    },
    {
      type: "closing",
      text: "If you already invest — calmly, imperfectly, without a spreadsheet — this is for you.",
      author: "Vlad, building One Day Investor",
    },
  ],
});

console.log("Seed complete: 1 post created.");
process.exit(0);
