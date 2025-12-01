# I Built an App Where You Can Debate Abraham Lincoln (And He Actually Argues Back)

You know that shower thought where you imagine winning an argument with a historical figure? Yeah, I actually built that.

## What Is This Thing?

DebateIQ lets you debate with AI versions of historical figures. You can argue about democracy with Abraham Lincoln, challenge Nikola Tesla on innovation, or just see what happens when you pick a fight with people who literally shaped history.

The twist? There's an AI judge that scores your arguments in real time and fact-checks everything you say. No mercy.

## Why Did I Build This?

Honestly, I was curious if AI could be used for something more interactive than just chatbots. Most AI apps feel like talking to a very smart librarian. I wanted something that felt like a game show, a history class, and a Twitter argument all mixed together.

Plus, debating is a skill. Most people never get good at it because there's no safe place to practice. You can't just walk up to someone and say "let's argue about climate change for 20 minutes." Well, you can, but you'll lose friends fast.

## How Does It Actually Work?

Here's the tech without the buzzwords:

**The Frontend** is React with TypeScript. Nothing fancy. You pick a figure, choose a topic, and start typing. The UI shows your score after each exchange and tells you if you're saying something factually wrong.

**The Backend** is where things get interesting. I used FastAPI with Google's Agent Development Kit (ADK) to create a multi-agent cluster. Each historical figure is a separate agent with its own personality based on their writings and speeches.

Google ADK handles the orchestration. It manages multiple agents running simultaneously, routes messages between them, and keeps track of conversation state. This is what makes figure-vs-figure debates possible—two agents can argue with each other while ADK coordinates everything.

For example, Lincoln's agent is programmed to speak formally, reference constitutional principles, and use that classic lawyer-politician style he was known for. Tesla is more direct and obsessed with innovation.

**The Smart Part** is the RAG system (Retrieval Augmented Generation, fancy name for "look stuff up before answering"). When you create a custom figure, the system pulls their Wikipedia page, breaks it into chunks, and stores it in a FAISS vector database. FAISS is Meta's similarity search library—it lets the AI find relevant information lightning fast.

When you debate a custom figure, the agent uses RAG to search through those Wikipedia chunks and pulls in relevant facts. So if you ask Lincoln about the Emancipation Proclamation, the AI doesn't just make something up. It actually references real historical context from Wikipedia.

**The Judge** is another AI agent in the cluster that evaluates both sides on five criteria:
- Logic and reasoning
- Factual accuracy
- How persuasive you are
- Whether you're actually addressing the topic
- How well you respond to counterarguments

The judge agent has access to tools—specifically a web search tool. When fact-checking claims, it can actually search the web to verify information. If you say "Lincoln freed the slaves immediately," it'll search for evidence, catch that it's only partially true (because the Proclamation was gradual and limited), and explain why.

**The Voice Part** uses Google's Text-to-Speech so the AI actually talks. Each figure has a different voice with different pitch and speed settings. Lincoln sounds deep and authoritative. Tesla sounds energetic. It's a small detail but it makes the debates feel way more real.

## The Cool Features

**1. You Can Create Your Own Figures**

I built three historical figures to start (Lincoln, Tesla, and Hitler for historical context). But the real magic is you can add anyone who has a Wikipedia page.

Type in a name, the system validates they exist, downloads their Wikipedia content, and boom. You can now debate Marie Curie, Einstein, Gandhi, whoever.

**2. Figure vs Figure Mode**

You can also make two AI agents debate each other. Watching Tesla and Lincoln argue about government regulation of innovation is weirdly entertaining. They just go back and forth automatically while you watch.

**3. Real-Time Scoring**

After every exchange, you see exactly how you did. The judge breaks down your score by category and explains what you did well or poorly. It's like having a debate coach who never gets tired.

**4. Voice Input**

You can speak your arguments instead of typing. Google's Speech-to-Text handles transcription. Makes it feel more like an actual debate.

## The Technical Challenges

**Making AI Sound Human (But Not Too Human)**

The hardest part was making each figure feel distinct without making them sound like caricatures. I spent a lot of time tweaking the system prompts to capture speaking styles without overdoing it.

Lincoln can't just say "four score and seven years ago" every sentence. He needs to sound formal but not like a costume.

**Keeping Facts Straight**

AI loves to make things up confidently. The RAG system helps by grounding responses in Wikipedia data stored in the FAISS vector database, but I also had to give the judge agent tools. The judge has access to a web search tool that it can use to verify claims in real time. It's not perfect, but it catches a lot of false statements.

**Managing Context**

Debates build on previous points. The AI needs to remember what was said three exchanges ago and reference it. Google's ADK handles session management, but I had to structure the conversation flow carefully so it doesn't lose the thread.

**Audio Caching**

Generating speech for every response was slow and expensive. I added a caching system so if the AI says the same thing twice, it reuses the audio file. Saved a ton of API calls.

## What I Learned

**1. AI Is Great At Being Confidently Wrong**

The fact-checking judge catches a lot of made-up stats. Even with RAG, the AI will sometimes just invent things that sound plausible. You need guardrails.

**2. People Argue Terribly**

Watching test users debate was eye-opening. Most people just state opinions without backing them up, ignore counterarguments, and declare victory. The scoring system helps people see their weak spots.

**3. Voice Changes Everything**

The difference between reading text and hearing it spoken is huge. Once I added TTS, the debates went from "interesting demo" to "thing people actually wanted to use."

**4. RAG + FAISS Is A Game Changer**

Being able to ground responses in real knowledge makes the AI 10x more useful. The combination of RAG (pulling relevant Wikipedia chunks) and FAISS (fast similarity search) means custom figures actually know things about their lives and work. Without Wikipedia context stored in the vector database, custom figures would just be generic AI with different names.

## The Tech Stack (For People Who Care)

**Frontend:** React, TypeScript, Vite, Tailwind CSS
**Backend:** FastAPI, Python
**AI:** Google Gemini 2.5 Flash Lite, Google ADK
**Knowledge:** LangChain, FAISS vector database, HuggingFace embeddings
**Voice:** Google Cloud TTS and Speech-to-Text
**Data:** Wikipedia API
**Infrastructure:** Docker, WebSockets

## What's Next?

Right now it's an MVP that works. The core experience is solid. But there's a lot I want to add:

- Tournament mode where you debate multiple figures in a row
- Multiplayer debates (two humans vs each other with AI judge)
- More detailed analytics on your debate style
- Public leaderboards
- Pre-made debate topics with curated research
- Better mobile support
- Video avatars for the figures (ambitious but cool)

## Try It Yourself

The project is on GitHub. You'll need API keys for Google's services (Gemini, TTS, Speech-to-Text), but the free tier is enough to test it out.

Setup is straightforward:
1. Clone the repo
2. Add your API keys to `.env` files
3. Run `docker-compose up`
4. Open localhost:3000

Then go argue with history.

## Final Thoughts

This project taught me that AI is most interesting when it's interactive, not just responsive. Instead of asking questions and getting answers, you're having an actual back-and-forth where both sides push each other.

The judge system turns it into a game. The voice makes it immersive. The RAG system makes it educational. Together, it's something people actually enjoy using, not just a tech demo.

Could this be useful for education? Absolutely. Debate teams, history classes, anyone learning critical thinking.

Could it just be fun? Also yes. Sometimes you just want to argue with Nikola Tesla about whether Edison was a fraud.

And now, thanks to AI, you can.

---

**Built by:** Rabin Dhakal
**Tech:** React, FastAPI, Google Gemini, RAG, TTS
**Source:** https://github.com/ashrotd/DebateIQ
**Demo:** https://youtu.be/epj4R1JaWE8

If you have questions or want to debate whether this was a good use of my time, hit me up. I'll let the AI judge decide who wins.
